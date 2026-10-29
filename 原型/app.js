// Keep the HTML readable without JavaScript; enhance only theme and scroll reveals.
const root = document.documentElement;
const toggle = document.querySelector('.theme-toggle');
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
let savedTheme;
try { savedTheme = localStorage.getItem('linan-theme'); } catch {}
function applyTheme(theme) {
  root.dataset.theme = theme;
  toggle.setAttribute('aria-label', theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式');
  toggle.setAttribute('aria-pressed', String(theme === 'dark'));
}
applyTheme(savedTheme || (systemTheme.matches ? 'dark' : 'light'));
toggle.addEventListener('click', () => {
  savedTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(savedTheme);
  try { localStorage.setItem('linan-theme', savedTheme); } catch {}
});
systemTheme.addEventListener('change', event => {
  if (!savedTheme) applyTheme(event.matches ? 'dark' : 'light');
});
if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    });
  }, { threshold: 0.08 });
  root.classList.add('motion-enabled');
  document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
}
