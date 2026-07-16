import './styles.css';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const body = document.body;
const header = document.querySelector('[data-header]');
const menuToggle = document.querySelector('[data-menu-toggle]');
const nav = document.getElementById('site-nav');
const briefLink = document.querySelector('[data-brief-link]');
const contactSection = document.getElementById('contact');
const form = document.querySelector('[data-brief-builder]');
const copyButton = document.querySelector('[data-copy-brief]');
const statusRegion = document.querySelector('[data-copy-status]');
const revealItems = document.querySelectorAll('.reveal');
const accordion = document.querySelector('[data-accordion]');

const closeMenu = ({ returnFocus = false } = {}) => {
  if (!menuToggle || !nav) return;
  menuToggle.setAttribute('aria-expanded', 'false');
  body.classList.remove('menu-open');
  if (window.innerWidth <= 900) {
    nav.setAttribute('hidden', '');
  }
  if (returnFocus) menuToggle.focus();
};

const openMenu = () => {
  if (!menuToggle || !nav) return;
  nav.removeAttribute('hidden');
  menuToggle.setAttribute('aria-expanded', 'true');
  body.classList.add('menu-open');
};

const syncMenuState = () => {
  if (!menuToggle || !nav) return;
  if (window.innerWidth > 900) {
    nav.removeAttribute('hidden');
    body.classList.remove('menu-open');
    menuToggle.setAttribute('aria-expanded', 'false');
  } else if (menuToggle.getAttribute('aria-expanded') !== 'true') {
    nav.setAttribute('hidden', '');
  }
};

syncMenuState();
window.addEventListener('resize', syncMenuState);

menuToggle?.addEventListener('click', () => {
  const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
  if (expanded) {
    closeMenu({ returnFocus: true });
  } else {
    openMenu();
    nav.querySelector('a')?.focus();
  }
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuToggle?.getAttribute('aria-expanded') === 'true') {
    closeMenu({ returnFocus: true });
  }
});

nav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => closeMenu());
});

const focusBrief = () => {
  if (!contactSection) return;
  const behavior = prefersReducedMotion.matches ? 'auto' : 'smooth';
  contactSection.scrollIntoView({ behavior, block: 'start' });
  window.setTimeout(() => {
    contactSection.focus({ preventScroll: true });
    form?.querySelector('input, select, textarea')?.focus({ preventScroll: true });
  }, prefersReducedMotion.matches ? 0 : 260);
};

briefLink?.addEventListener('click', (event) => {
  event.preventDefault();
  focusBrief();
});

if (!prefersReducedMotion.matches && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14 }
  );

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}

accordion?.querySelectorAll('details').forEach((detail) => {
  detail.addEventListener('toggle', () => {
    if (!detail.open) return;
    accordion.querySelectorAll('details').forEach((other) => {
      if (other !== detail) other.open = false;
    });
  });
});

const buildBrief = () => {
  const data = new FormData(form);
  const get = (key) => (data.get(key) || '').toString().trim();
  const lines = [
    'Latitude Iberia enquiry brief',
    '--------------------------------',
    `Company / name: ${get('companyName') || 'Not provided'}`,
    `Email: ${get('email') || 'Not provided'}`,
    `Travel type: ${get('travelType') || 'Not provided'}`,
    `Destination: ${get('destination') || 'Not provided'}`,
    `Estimated group size: ${get('groupSize') || 'Not provided'}`,
    `Travel window: ${get('travelWindow') || 'Not provided'}`,
    '',
    'Notes',
    get('notes') || 'Not provided',
  ];
  return lines.join('\n');
};

const copyWithFallback = async (text) => {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const helper = document.createElement('textarea');
  helper.value = text;
  helper.setAttribute('readonly', '');
  helper.style.position = 'fixed';
  helper.style.opacity = '0';
  document.body.append(helper);
  helper.select();
  helper.setSelectionRange(0, helper.value.length);
  const copied = document.execCommand('copy');
  helper.remove();
  return copied;
};

copyButton?.addEventListener('click', async () => {
  const text = buildBrief();
  statusRegion.textContent = '';

  try {
    const copied = await copyWithFallback(text);
    if (!copied) throw new Error('Copy failed');
    statusRegion.textContent = 'Enquiry brief copied. Share it with your usual Latitude Iberia contact.';
  } catch (error) {
    statusRegion.textContent = 'Copy was not available in this browser. Select the fields and paste them into your own message.';
  }
});

header?.querySelector('.brand')?.addEventListener('click', (event) => {
  if (event.currentTarget.getAttribute('href') !== '#top') return;
  event.preventDefault();
  window.scrollTo({ top: 0, behavior: prefersReducedMotion.matches ? 'auto' : 'smooth' });
});
