import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const port = 4173;
const host = '127.0.0.1';
const baseUrl = `http://${host}:${port}/`;
const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const artifactsDir = resolve(projectRoot, 'qa-artifacts');
const viteBin = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));

async function waitForServer(url, attempts = 80) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // Preview is still starting.
    }
    await wait(250);
  }
  throw new Error(`Preview server did not respond at ${url}`);
}

function trackErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

async function loadAllImages(page, viewportHeight) {
  await page.locator('img').evaluateAll((images) => images.forEach((image) => { image.loading = 'eager'; }));
  const fullHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const step = Math.max(300, Math.floor(viewportHeight * 0.7));
  for (let position = 0; position < fullHeight; position += step) {
    await page.evaluate((scrollPosition) => window.scrollTo(0, scrollPosition), position);
    await page.waitForTimeout(30);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(() => [...document.images].every((image) => image.complete), { timeout: 10000 });
}

async function assertPageIntegrity(page) {
  if (!(await page.title()).includes('Latitude Iberia')) throw new Error('Unexpected document title');
  if (!(await page.locator('h1').isVisible())) throw new Error('H1 is not visible');

  const duplicateIds = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map((element) => element.id);
    return ids.filter((id, index) => ids.indexOf(id) !== index);
  });
  if (duplicateIds.length) throw new Error(`Duplicate IDs: ${duplicateIds.join(', ')}`);

  const brokenImages = await page.locator('img').evaluateAll((images) => images.filter((image) => image.naturalWidth === 0).map((image) => image.src));
  if (brokenImages.length) throw new Error(`Broken images: ${brokenImages.join(', ')}`);

  const overflow = await page.evaluate(() => ({ body: document.body.scrollWidth, document: document.documentElement.scrollWidth, inner: window.innerWidth }));
  if (overflow.body > overflow.inner + 1 || overflow.document > overflow.inner + 1) {
    const diagnostics = await page.evaluate(() => ({
      offenders: [...document.querySelectorAll('body *')]
        .map((element) => ({ selector: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${element.classList.length ? `.${[...element.classList].join('.')}` : ''}`, left: Math.round(element.getBoundingClientRect().left), right: Math.round(element.getBoundingClientRect().right), width: Math.round(element.getBoundingClientRect().width), scrollWidth: element.scrollWidth, clientWidth: element.clientWidth, overflowX: getComputedStyle(element).overflowX }))
        .filter((box) => box.right > window.innerWidth + 1 || box.left < -1)
        .sort((a, b) => b.right - a.right)
        .slice(0, 12),
      wideContainers: [...document.querySelectorAll('body *')]
        .map((element) => ({ selector: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${element.classList.length ? `.${[...element.classList].join('.')}` : ''}`, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth, overflowX: getComputedStyle(element).overflowX }))
        .filter((box) => box.scrollWidth > box.clientWidth + 2)
        .sort((a, b) => (b.scrollWidth - b.clientWidth) - (a.scrollWidth - a.clientWidth))
        .slice(0, 12),
    }));
    throw new Error(`Horizontal overflow: ${JSON.stringify(overflow)} diagnostics=${JSON.stringify(diagnostics)}`);
  }
}

async function testMobileMenu(page) {
  const toggle = page.locator('[data-menu-toggle]');
  await toggle.click();
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') throw new Error('Mobile menu did not expose expanded state');
  if ((await page.evaluate(() => getComputedStyle(document.body).overflow)) !== 'hidden') throw new Error('Mobile menu did not lock body scrolling');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.querySelector('[data-menu-toggle]')?.getAttribute('aria-expanded') === 'false');
  if (!(await toggle.evaluate((element) => element === document.activeElement))) throw new Error('Escape did not restore menu-toggle focus');

  await toggle.click();
  await page.locator('#site-nav a[href="#destinations"]').click();
  await page.waitForFunction(() => document.querySelector('[data-menu-toggle]')?.getAttribute('aria-expanded') === 'false');
}

async function testInterfaces(page) {
  await page.locator('#destinations').scrollIntoViewIfNeeded();
  const portugalTab = page.locator('#country-portugal');
  await portugalTab.focus();
  await page.keyboard.press('ArrowRight');
  const spainTab = page.locator('#country-spain');
  if ((await spainTab.getAttribute('aria-selected')) !== 'true') throw new Error('Destination tabs did not respond to keyboard arrows');
  if ((await page.locator('[data-destination-title]').textContent())?.trim() !== 'Madrid') throw new Error('Spain destination content did not render');
  await page.getByRole('button', { name: 'Barcelona', exact: true }).click();
  if ((await page.locator('[data-destination-title]').textContent())?.trim() !== 'Barcelona') throw new Error('Region selection did not update destination content');

  await page.locator('#programmes').scrollIntoViewIfNeeded();
  await page.locator('[data-programme-next]').click();
  if (!(await page.locator('[data-programme-title]').textContent())?.includes('Cities')) throw new Error('Programme next control did not update content');
  await page.locator('#programme-tab-1').focus();
  await page.keyboard.press('ArrowRight');
  if ((await page.locator('#programme-tab-2').getAttribute('aria-selected')) !== 'true') throw new Error('Programme tabs did not respond to keyboard arrows');

  await page.locator('[data-operation="4"]').click();
  if (!(await page.locator('[data-operation-title]').textContent())?.includes('MICE')) throw new Error('Operation interface did not update');
}

async function testBriefBuilder(page) {
  const menuToggle = page.locator('[data-menu-toggle]');
  if (await menuToggle.isVisible()) await menuToggle.click();
  await page.locator('[data-brief-link]').first().click();
  await page.waitForTimeout(100);
  if (!(await page.locator('#brief input[name="companyName"]').evaluate((element) => element === document.activeElement))) throw new Error('Start-a-brief CTA did not focus the first field');

  await page.locator('[data-copy-brief]').click();
  if (!(await page.locator('[data-form-error]').textContent())?.includes('Company')) throw new Error('Empty brief did not show useful validation');

  await page.fill('input[name="companyName"]', 'Northbound Travel');
  await page.fill('input[name="email"]', 'ops@northbound.example');
  await page.selectOption('select[name="travelType"]', 'Groups & series');
  await page.locator('input[name="destination"][value="Both"]').check();
  await page.fill('input[name="groupSize"]', '24');
  await page.fill('input[name="travelWindow"]', 'October 2027');
  await page.fill('textarea[name="notes"]', 'A Portugal and Spain programme with two shared evening events.');

  await page.locator('[data-copy-brief]').click();
  await page.waitForFunction(() => document.querySelector('[data-brief-status]')?.textContent.includes('copied'));
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  if (!clipboardText.includes('Northbound Travel') || !clipboardText.includes('Destination: Both')) throw new Error('Copied brief is incomplete');

  const downloadPromise = page.waitForEvent('download');
  await page.locator('[data-download-brief]').click();
  const download = await downloadPromise;
  if (download.suggestedFilename() !== 'latitude-iberia-partner-brief.txt') throw new Error('Brief download filename is incorrect');
  await page.locator('[data-brief-builder]').evaluate((briefForm) => briefForm.reset());
  await page.locator('[data-form-error]').evaluate((element) => { element.textContent = ''; });
  await page.locator('[data-brief-status]').evaluate((element) => { element.textContent = ''; });
}

async function checkViewport(browser, config) {
  const context = await browser.newContext({ viewport: config.viewport, colorScheme: 'light', reducedMotion: 'reduce', permissions: ['clipboard-read', 'clipboard-write'], acceptDownloads: true });
  const page = await context.newPage();
  const errors = trackErrors(page);
  try {
    const response = await page.goto(baseUrl, { waitUntil: 'networkidle' });
    if (!response?.ok()) throw new Error(`Page failed to load: ${response?.status()}`);
    await loadAllImages(page, config.viewport.height);
    await assertPageIntegrity(page);
    if (config.viewport.width <= 960) await testMobileMenu(page);
    await testInterfaces(page);
    await testBriefBuilder(page);

    const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    if (accessibility.violations.length) {
      throw new Error(`Accessibility violations:\n${accessibility.violations.map((violation) => `${violation.id}: ${violation.nodes.length} — ${violation.help}\n${violation.nodes.map((node) => `  ${node.target.join(' ')}: ${node.failureSummary}`).join('\n')}`).join('\n')}`);
    }
    await assertPageIntegrity(page);
    if (errors.length) throw new Error(errors.join('\n'));

    await page.evaluate(() => { window.scrollTo(0, 0); document.activeElement?.blur(); });
    await mkdir(artifactsDir, { recursive: true });
    await page.screenshot({ path: resolve(artifactsDir, `${config.name}.png`), fullPage: true });
  } finally {
    await context.close();
  }
}

const preview = spawn(process.execPath, [viteBin, 'preview', '--host', host, '--port', String(port), '--strictPort'], {
  cwd: projectRoot,
  stdio: 'pipe',
  env: { ...process.env },
  detached: process.platform !== 'win32',
});
let previewOutput = '';
preview.stdout.on('data', (chunk) => { previewOutput += chunk.toString(); });
preview.stderr.on('data', (chunk) => { previewOutput += chunk.toString(); });

async function stopPreview() {
  if (preview.exitCode !== null) return;
  const exited = new Promise((resolveExit) => preview.once('exit', resolveExit));
  if (process.platform === 'win32') preview.kill('SIGTERM');
  else process.kill(-preview.pid, 'SIGTERM');
  await Promise.race([exited, wait(3000)]);
  if (preview.exitCode === null) {
    if (process.platform === 'win32') preview.kill('SIGKILL');
    else process.kill(-preview.pid, 'SIGKILL');
    await exited;
  }
}

try {
  await waitForServer(baseUrl);
  const browser = await chromium.launch();
  try {
    const viewports = [
      { name: 'mobile-360x740', viewport: { width: 360, height: 740 } },
      { name: 'mobile-390x844', viewport: { width: 390, height: 844 } },
      { name: 'desktop-1366x768', viewport: { width: 1366, height: 768 } },
      { name: 'desktop-1440x1000', viewport: { width: 1440, height: 1000 } },
    ];
    for (const viewport of viewports) await checkViewport(browser, viewport);

    const noJsContext = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
    try {
      const page = await noJsContext.newPage();
      const response = await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
      if (!response?.ok()) throw new Error('JavaScript-disabled page did not load');
      if (!(await page.locator('h1').isVisible())) throw new Error('H1 is hidden without JavaScript');
      if ((await page.locator('#site-nav a').count()) !== 5) throw new Error('Core navigation is incomplete without JavaScript');
      if (!(await page.locator('#brief').isVisible())) throw new Error('Brief content is hidden without JavaScript');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 1) throw new Error(`JavaScript-disabled page overflows by ${overflow}px`);
    } finally {
      await noJsContext.close();
    }
  } finally {
    await browser.close();
  }
  const summary = 'QA completed successfully: 360x740, 390x844, 1366x768, 1440x1000; interactions, axe, overflow, images and no-JS content passed.\n';
  await writeFile(resolve(artifactsDir, 'summary.txt'), summary);
  console.log(summary.trim());
} catch (error) {
  console.error(previewOutput);
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
} finally {
  await stopPreview();
}
