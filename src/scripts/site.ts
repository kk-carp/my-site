const toggle = document.querySelector<HTMLButtonElement>('.theme-toggle');
const root = document.documentElement;
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
let hasPreference = false;
try { hasPreference = ['light', 'dark'].includes(localStorage.getItem('linan-theme') || ''); } catch {}

function applyTheme(theme: 'light' | 'dark') {
  root.dataset.theme = theme;
  toggle?.setAttribute('aria-label', theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式');
  toggle?.setAttribute('aria-pressed', String(theme === 'dark'));
}

applyTheme(root.dataset.theme === 'dark' ? 'dark' : 'light');
toggle?.addEventListener('click', () => {
  const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  hasPreference = true;
  applyTheme(theme);
  try { localStorage.setItem('linan-theme', theme); } catch {}
});
systemTheme.addEventListener('change', event => {
  if (!hasPreference) applyTheme(event.matches ? 'dark' : 'light');
});

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  root.classList.add('motion-enabled');
  document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
}
