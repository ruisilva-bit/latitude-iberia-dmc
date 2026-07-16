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
const screenshotsDir = resolve(projectRoot, 'qa-artifacts');
const viteBin = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForServer(url, attempts = 80) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // keep polling
    }
    await wait(250);
  }
  throw new Error(`Preview server did not respond at ${url}`);
}

async function collectPageErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(`console: ${message.text()}`);
    }
  });
  return errors;
}

async function checkViewport(browser, config) {
  const context = await browser.newContext({
    viewport: config.viewport,
    colorScheme: 'light',
    reducedMotion: 'reduce',
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();
  const errors = await collectPageErrors(page);

  try {
    const response = await page.goto(baseUrl, { waitUntil: 'networkidle' });
    if (!response?.ok()) throw new Error(`Failed to load page at ${baseUrl}`);

    await page.locator('img').evaluateAll((images) => {
      images.forEach((image) => {
        image.loading = 'eager';
      });
    });

    const fullHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const step = Math.max(300, Math.floor(config.viewport.height * 0.7));
    for (let y = 0; y < fullHeight; y += step) {
      await page.evaluate((position) => window.scrollTo(0, position), y);
      await page.waitForTimeout(40);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForFunction(() => [...document.images].every((image) => image.complete), { timeout: 10000 });

    const title = await page.title();
    if (!title.includes('Latitude Iberia')) throw new Error(`Unexpected title: ${title}`);

    const h1 = (await page.locator('h1').textContent())?.trim();
    if (!h1) throw new Error('Missing H1');

    const brokenImages = await page.locator('img').evaluateAll((images) =>
      images.filter((image) => image.naturalWidth === 0).map((image) => image.src)
    );
    if (brokenImages.length) throw new Error(`Broken images: ${brokenImages.join(', ')}`);

    const overflow = await page.evaluate(() => ({
      body: document.body.scrollWidth,
      document: document.documentElement.scrollWidth,
      inner: window.innerWidth,
    }));
    if (overflow.body > overflow.inner + 1 || overflow.document > overflow.inner + 1) {
      throw new Error(`Horizontal overflow detected: ${JSON.stringify(overflow)}`);
    }

    const menuToggle = page.locator('[data-menu-toggle]');
    if (config.viewport.width < 901) {
      await menuToggle.click();
      const expanded = await menuToggle.getAttribute('aria-expanded');
      if (expanded !== 'true') throw new Error('Mobile menu did not open');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.querySelector('[data-menu-toggle]')?.getAttribute('aria-expanded') === 'false');
    }

    await page.locator('[data-brief-link]').click();
    await page.waitForTimeout(250);
    const activeId = await page.evaluate(() => document.activeElement?.closest('#contact')?.id || document.activeElement?.id || '');
    if (!activeId.includes('contact')) throw new Error('Primary CTA did not move focus into the brief area');

    await page.fill('input[name="companyName"]', 'Northbound Travel');
    await page.fill('input[name="email"]', 'ops@northbound.example');
    await page.selectOption('select[name="travelType"]', 'Groups & series');
    await page.locator('input[name="destination"][value="Both"]').check();
    await page.fill('input[name="groupSize"]', '24 guests');
    await page.fill('input[name="travelWindow"]', 'October 2027');
    await page.fill('textarea[name="notes"]', 'Need Portugal and Spain with two gala moments.');
    await page.locator('[data-copy-brief]').click();
    await page.waitForFunction(() => {
      const text = document.querySelector('[data-copy-status]')?.textContent || '';
      return text.includes('copied') || text.includes('Copy was not available');
    });

    const statusText = (await page.locator('[data-copy-status]').textContent())?.trim() || '';
    if (!statusText.includes('copied')) throw new Error(`Clipboard success was not reported: ${statusText}`);

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    if (!clipboardText.includes('Northbound Travel') || !clipboardText.includes('Destination: Both')) {
      throw new Error('Copied brief did not contain the entered partner details');
    }

    const accessibility = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    if (accessibility.violations.length) {
      const summary = accessibility.violations
        .map((violation) => `${violation.id}: ${violation.nodes.length} node(s) — ${violation.help}`)
        .join('\n');
      throw new Error(`Accessibility violations detected:\n${summary}`);
    }

    await page.evaluate(() => document.activeElement?.blur());
    await mkdir(screenshotsDir, { recursive: true });
    await page.screenshot({ path: resolve(screenshotsDir, `${config.name}.png`), fullPage: true });

    if (errors.length) {
      throw new Error(errors.join('\n'));
    }
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
preview.stdout.on('data', (chunk) => {
  previewOutput += chunk.toString();
});
preview.stderr.on('data', (chunk) => {
  previewOutput += chunk.toString();
});

const stopPreview = async () => {
  if (preview.exitCode !== null) return;
  const exited = new Promise((resolve) => preview.once('exit', resolve));
  if (process.platform === 'win32') {
    preview.kill('SIGTERM');
  } else {
    process.kill(-preview.pid, 'SIGTERM');
  }
  await Promise.race([exited, wait(3000)]);
  if (preview.exitCode === null) {
    if (process.platform === 'win32') {
      preview.kill('SIGKILL');
    } else {
      process.kill(-preview.pid, 'SIGKILL');
    }
    await exited;
  }
};

try {
  await waitForServer(baseUrl);
  const browser = await chromium.launch();
  try {
    const viewports = [
      { name: 'mobile-390x844', viewport: { width: 390, height: 844 } },
      { name: 'tablet-768x1024', viewport: { width: 768, height: 1024 } },
      { name: 'desktop-1440x1000', viewport: { width: 1440, height: 1000 } },
    ];

    for (const viewport of viewports) {
      await checkViewport(browser, viewport);
    }

    const noJsContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      javaScriptEnabled: false,
    });
    try {
      const noJsPage = await noJsContext.newPage();
      const response = await noJsPage.goto(baseUrl, { waitUntil: 'domcontentloaded' });
      if (!response?.ok()) throw new Error('JavaScript-disabled page did not load');
      if (!(await noJsPage.locator('h1').isVisible())) throw new Error('H1 is unavailable without JavaScript');
      if ((await noJsPage.locator('#site-nav a').count()) !== 5) throw new Error('Core navigation is incomplete without JavaScript');
      if (!(await noJsPage.locator('#contact').isVisible())) throw new Error('Contact content is unavailable without JavaScript');
      const noJsOverflow = await noJsPage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (noJsOverflow > 1) throw new Error(`JavaScript-disabled page overflows by ${noJsOverflow}px`);
    } finally {
      await noJsContext.close();
    }
  } finally {
    await browser.close();
  }

  await writeFile(resolve(screenshotsDir, 'summary.txt'), 'QA completed successfully across 390x844, 768x1024, 1440x1000.\n');
  console.log('QA completed successfully across 390x844, 768x1024, 1440x1000.');
} catch (error) {
  console.error(previewOutput);
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
} finally {
  await stopPreview();
}
