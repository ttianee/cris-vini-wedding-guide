window.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('menuToggle');
  const nav = document.querySelector('.desktop-nav');
  if (!toggle || !nav) return;
  const setLabel = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar navegação' : 'Abrir navegação entre páginas');
    toggle.innerHTML = open ? '<span>FECHAR</span> ×' : '<span>PÁGINAS</span> ☰';
  };
  setLabel(false);
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    setLabel(open);
  });
});
