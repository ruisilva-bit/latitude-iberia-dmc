import './styles.css';

document.documentElement.classList.replace('no-js', 'js');

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const mobileMenuQuery = window.matchMedia('(max-width: 960px)');
const body = document.body;
const menuToggle = document.querySelector('[data-menu-toggle]');
const menuLabel = menuToggle?.querySelector('.menu-label');
const nav = document.getElementById('site-nav');
const briefSection = document.getElementById('brief');

const getFocusableMenuItems = () => [...(nav?.querySelectorAll('a') || [])];

function closeMenu({ restoreFocus = false } = {}) {
  if (!menuToggle || !nav) return;
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Open menu');
  if (menuLabel) menuLabel.textContent = 'Menu';
  body.classList.remove('menu-open');
  if (mobileMenuQuery.matches) nav.hidden = true;
  if (restoreFocus) menuToggle.focus();
}

function openMenu() {
  if (!menuToggle || !nav) return;
  nav.hidden = false;
  menuToggle.setAttribute('aria-expanded', 'true');
  menuToggle.setAttribute('aria-label', 'Close menu');
  if (menuLabel) menuLabel.textContent = 'Close';
  body.classList.add('menu-open');
  getFocusableMenuItems()[0]?.focus();
}

function syncMenu() {
  if (!menuToggle || !nav) return;
  if (mobileMenuQuery.matches) {
    if (menuToggle.getAttribute('aria-expanded') !== 'true') nav.hidden = true;
    return;
  }
  nav.hidden = false;
  menuToggle.setAttribute('aria-expanded', 'false');
  body.classList.remove('menu-open');
}

syncMenu();
mobileMenuQuery.addEventListener('change', syncMenu);
menuToggle?.addEventListener('click', () => {
  const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
  if (isOpen) closeMenu({ restoreFocus: true });
  else openMenu();
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuToggle?.getAttribute('aria-expanded') === 'true') {
    closeMenu({ restoreFocus: true });
    return;
  }
  if (event.key !== 'Tab' || menuToggle?.getAttribute('aria-expanded') !== 'true') return;
  const focusable = [menuToggle, ...getFocusableMenuItems()];
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => closeMenu()));

function focusBrief(event) {
  event?.preventDefault();
  closeMenu();
  briefSection?.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
  window.setTimeout(() => {
    briefSection?.focus({ preventScroll: true });
    briefSection?.querySelector('input')?.focus({ preventScroll: true });
  }, reducedMotion.matches ? 0 : 350);
}

document.querySelectorAll('[data-brief-link]').forEach((link) => link.addEventListener('click', focusBrief));

const hero = document.querySelector('[data-hero]');
const heroCountryButtons = [...document.querySelectorAll('[data-hero-country]')];

function setHeroFocus(country = '') {
  hero?.classList.toggle('hero-focus-portugal', country === 'portugal');
  hero?.classList.toggle('hero-focus-spain', country === 'spain');
  heroCountryButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.heroCountry === country)));
}

heroCountryButtons.forEach((button) => {
  button.addEventListener('pointerenter', () => {
    if (window.matchMedia('(hover: hover)').matches) setHeroFocus(button.dataset.heroCountry);
  });
  button.addEventListener('focus', () => setHeroFocus(button.dataset.heroCountry));
  button.addEventListener('click', () => {
    const country = button.dataset.heroCountry;
    const isActive = button.getAttribute('aria-pressed') === 'true';
    setHeroFocus(isActive ? '' : country);
  });
});
hero?.addEventListener('pointerleave', () => {
  if (window.matchMedia('(hover: hover)').matches) setHeroFocus();
});

const destinations = {
  portugal: [
    { title: 'Lisbon', code: 'PT / 01', image: './images/lisbon.webp', alt: 'Lisbon rooftops and river in warm Atlantic light', tone: 'Urban base / day-trip radius', pair: 'Alentejo · Porto · Madrid', copy: 'Atlantic light, strong air access and a useful first chapter for culture, food and coast-led programmes.', position: 'center 52%' },
    { title: 'Porto & Douro', code: 'PT / 02', image: './images/porto.webp', alt: "Porto's riverside architecture along the Douro", tone: 'City texture / wine country', pair: 'Lisbon · Galicia · Basque Country', copy: 'A compact urban anchor opening into river landscapes, cellar visits and a naturally slower inland rhythm.', position: 'center 55%' },
    { title: 'Alentejo', code: 'PT / 03', image: './images/lisbon.webp', alt: 'Warm Portuguese landscape and architecture', tone: 'Rural immersion / slow travel', pair: 'Lisbon · Algarve · Andalusia', copy: 'Open landscapes and measured pacing for food, wine, heritage and small-scale stays between larger city chapters.', position: 'center 80%' },
    { title: 'Algarve', code: 'PT / 04', image: './images/porto.webp', alt: 'Portuguese architecture in clear southern light', tone: 'Coastal close / resort base', pair: 'Alentejo · Lisbon · Andalusia', copy: 'A coast-led final chapter that can combine leisure time with active, culinary or small-group programme layers.', position: 'center 25%' },
  ],
  spain: [
    { title: 'Madrid', code: 'ES / 01', image: './images/madrid.webp', alt: 'Madrid city architecture beneath a clear sky', tone: 'Capital energy / cultural anchor', pair: 'Castile · Andalusia · Lisbon', copy: 'A confident hub for art, gastronomy and incentive energy, with strong onward logic by rail and air.', position: 'center 48%' },
    { title: 'Barcelona', code: 'ES / 02', image: './images/barcelona.webp', alt: 'Barcelona cityscape and distinctive Catalan architecture', tone: 'Design city / Mediterranean edge', pair: 'Catalonia · Madrid · Basque Country', copy: 'Architecture, food and the Mediterranean in one high-energy base, shaped carefully around timing and guest flow.', position: 'center 50%' },
    { title: 'Andalusia', code: 'ES / 03', image: './images/madrid.webp', alt: 'Spanish architecture in strong southern light', tone: 'Multi-city cultural route', pair: 'Madrid · Algarve · Alentejo', copy: 'Seville, Córdoba, Granada and the coast reward edited routing, distinct pacing and disciplined transport planning.', position: 'center 72%' },
    { title: 'Basque Country', code: 'ES / 04', image: './images/barcelona.webp', alt: 'Northern Spanish urban landscape', tone: 'Gastronomy / Atlantic contrast', pair: 'Madrid · Barcelona · Douro', copy: 'A compact northern circuit where food, design and coast can support specialist FITs or focused small groups.', position: 'center 28%' },
  ],
};

const destinationRoot = document.querySelector('[data-destinations]');
const countryTabs = [...(destinationRoot?.querySelectorAll('[role="tab"]') || [])];
const destinationPanel = destinationRoot?.querySelector('[role="tabpanel"]');
const regionList = destinationRoot?.querySelector('[data-region-list]');
let activeCountry = 'portugal';
let activeRegion = 0;

function renderRegionButtons() {
  if (!regionList) return;
  regionList.replaceChildren(...destinations[activeCountry].map((region, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = region.title;
    button.dataset.region = String(index);
    button.setAttribute('aria-pressed', String(index === activeRegion));
    button.addEventListener('click', () => selectRegion(index));
    return button;
  }));
}

function selectRegion(index) {
  activeRegion = index;
  const region = destinations[activeCountry][index];
  if (!destinationRoot || !region) return;
  const image = destinationRoot.querySelector('[data-destination-image]');
  image.src = region.image;
  image.alt = region.alt;
  image.style.objectPosition = region.position;
  destinationRoot.querySelector('[data-destination-number]').textContent = region.code;
  destinationRoot.querySelector('[data-destination-title]').textContent = region.title;
  destinationRoot.querySelector('[data-destination-copy]').textContent = region.copy;
  destinationRoot.querySelector('[data-destination-tone]').textContent = region.tone;
  destinationRoot.querySelector('[data-destination-pair]').textContent = region.pair;
  regionList?.querySelectorAll('button').forEach((button, buttonIndex) => button.setAttribute('aria-pressed', String(buttonIndex === index)));
}

function selectCountry(country, { focus = false } = {}) {
  activeCountry = country;
  activeRegion = 0;
  countryTabs.forEach((tab) => {
    const selected = tab.dataset.country === country;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected) {
      destinationPanel?.setAttribute('aria-labelledby', tab.id);
      if (focus) tab.focus();
    }
  });
  renderRegionButtons();
  selectRegion(0);
}

function bindRovingTabs(tabs, selectFromTab) {
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectFromTab(tab));
    tab.addEventListener('keydown', (event) => {
      const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      let next = index;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      selectFromTab(tabs[next], true);
    });
  });
}

bindRovingTabs(countryTabs, (tab, focus = false) => selectCountry(tab.dataset.country, { focus }));
selectCountry(activeCountry);

const programmeData = [
  { kicker: 'FIT / luxury advisor', title: 'The Atlantic Edit', copy: 'A privately paced Lisbon–Alentejo–Porto journey, balancing cultural access with space to absorb each place.', features: ['8–11 days', 'Portugal', 'Flexible service layers'], route: ['Lisbon', 'Alentejo', 'Porto & Douro'] },
  { kicker: 'Tour operator / hosted group', title: 'Cities in Dialogue', copy: 'A connected Madrid–Porto–Lisbon programme using the contrast between capitals, Atlantic cities and considered rail or road transitions.', features: ['9–12 days', 'Portugal + Spain', 'Small groups / series'], route: ['Madrid', 'Porto', 'Lisbon'] },
  { kicker: 'Incentive house / MICE planner', title: 'Southern Assembly', copy: 'A high-energy Seville or Lisbon base with venue, movement and experience layers designed around the group’s purpose.', features: ['3–5 nights', 'Single or twin hub', 'Guest-flow led'], route: ['Arrival hub', 'Shared experience', 'Finale'] },
];

const programmeRoot = document.querySelector('[data-programmes]');
const programmeTabs = [...(programmeRoot?.querySelectorAll('[role="tab"]') || [])];
const programmePanel = programmeRoot?.querySelector('[role="tabpanel"]');
let activeProgramme = 0;

function selectProgramme(index, { focus = false } = {}) {
  activeProgramme = (index + programmeData.length) % programmeData.length;
  const programme = programmeData[activeProgramme];
  if (!programmeRoot) return;
  programmeTabs.forEach((tab, tabIndex) => {
    const selected = tabIndex === activeProgramme;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected) {
      programmePanel?.setAttribute('aria-labelledby', tab.id);
      if (focus) tab.focus();
    }
  });
  programmeRoot.querySelector('[data-programme-counter]').textContent = `0${activeProgramme + 1} — 0${programmeData.length}`;
  programmeRoot.querySelector('[data-programme-kicker]').textContent = programme.kicker;
  programmeRoot.querySelector('[data-programme-title]').textContent = programme.title;
  programmeRoot.querySelector('[data-programme-copy]').textContent = programme.copy;
  const featureList = programmeRoot.querySelector('[data-programme-features]');
  featureList.replaceChildren(...programme.features.map((text) => Object.assign(document.createElement('li'), { textContent: text })));
  const routeList = programmeRoot.querySelector('[data-programme-route]');
  routeList.replaceChildren(...programme.route.map((text) => Object.assign(document.createElement('li'), { textContent: text })));
}

bindRovingTabs(programmeTabs, (tab, focus = false) => selectProgramme(Number(tab.dataset.programme), { focus }));
programmeRoot?.querySelector('[data-programme-prev]')?.addEventListener('click', () => selectProgramme(activeProgramme - 1));
programmeRoot?.querySelector('[data-programme-next]')?.addEventListener('click', () => selectProgramme(activeProgramme + 1));

const operationData = [
  ['Contracting & sourcing', 'Supplier selection shaped by the brief, route and service level, with commercial assumptions made visible to the partner.'],
  ['Itinerary design', 'Route architecture built around audience, tempo and realistic movement—not a sequence of disconnected inventory.'],
  ['Transport & logistics', 'Vehicle, rail, flight and baggage decisions coordinated as one movement plan with practical margins.'],
  ['Guides & experiences', 'Local interpretation and access selected for relevance, delivery style and fit with the programme narrative.'],
  ['MICE & incentives', 'Venue logic, production layers and guest flow developed around the event objective and group profile.'],
  ['On-trip coordination', 'One operational thread for supplier alignment, schedule control and grounded problem-solving during travel.'],
];
const operationButtons = [...document.querySelectorAll('[data-operation]')];
operationButtons.forEach((button) => button.addEventListener('click', () => {
  const index = Number(button.dataset.operation);
  operationButtons.forEach((item) => item.classList.toggle('active', item === button));
  document.querySelector('[data-operation-number]').textContent = String(index + 1).padStart(2, '0');
  document.querySelector('[data-operation-title]').textContent = operationData[index][0];
  document.querySelector('[data-operation-copy]').textContent = operationData[index][1];
}));

const form = document.querySelector('[data-brief-builder]');
const formError = document.querySelector('[data-form-error]');
const briefStatus = document.querySelector('[data-brief-status]');

function validateBrief() {
  if (!form) return false;
  const fields = [...form.querySelectorAll('input, select, textarea')];
  fields.forEach((field) => field.removeAttribute('aria-invalid'));
  if (form.checkValidity()) {
    formError.textContent = '';
    return true;
  }
  const invalid = fields.find((field) => !field.checkValidity());
  invalid?.setAttribute('aria-invalid', 'true');
  const fieldName = invalid?.closest('label, fieldset')?.querySelector('span, legend')?.textContent?.replace(' *', '') || 'Required field';
  formError.textContent = `${fieldName}: ${invalid?.validationMessage || 'Please complete this field.'}`;
  invalid?.focus();
  return false;
}

function buildBrief() {
  const data = new FormData(form);
  const value = (name) => String(data.get(name) || '').trim() || 'Not provided';
  return [
    'LATITUDE IBERIA — PARTNER BRIEF',
    '================================',
    `Company / name: ${value('companyName')}`,
    `Work email: ${value('email')}`,
    `Programme type: ${value('travelType')}`,
    `Destination: ${value('destination')}`,
    `Travel window: ${value('travelWindow')}`,
    `Estimated guests: ${value('groupSize')}`,
    '',
    'BRIEF NOTES',
    value('notes'),
    '',
    'Generated locally in the browser; not submitted or sent.',
  ].join('\n');
}

async function copyText(text) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const helper = Object.assign(document.createElement('textarea'), { value: text });
  helper.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
  document.body.append(helper);
  helper.select();
  const success = document.execCommand('copy');
  helper.remove();
  if (!success) throw new Error('Clipboard unavailable');
}

document.querySelector('[data-copy-brief]')?.addEventListener('click', async () => {
  briefStatus.textContent = '';
  if (!validateBrief()) return;
  try {
    await copyText(buildBrief());
    briefStatus.textContent = 'Brief copied. Paste it into your preferred partner channel.';
  } catch {
    formError.textContent = 'Copy is unavailable in this browser. Use Download .txt instead.';
  }
});

document.querySelector('[data-download-brief]')?.addEventListener('click', () => {
  briefStatus.textContent = '';
  if (!validateBrief()) return;
  const file = new Blob([buildBrief()], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'latitude-iberia-partner-brief.txt';
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  briefStatus.textContent = 'Brief downloaded to your device.';
});

form?.addEventListener('input', (event) => {
  event.target?.removeAttribute('aria-invalid');
  formError.textContent = '';
  briefStatus.textContent = '';
});

document.querySelectorAll('a[href="#top"]').forEach((link) => link.addEventListener('click', (event) => {
  event.preventDefault();
  window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
}));
