(() => {
  const mapFrame = document.getElementById('travelMap');
  if (!mapFrame) return;
  const views = {
    local: {
      pt: 'Mapa interativo: Aeroporto de Ilhéus até Hotel Transamerica Comandatuba',
      en: 'Interactive map: Ilhéus Airport to Hotel Transamerica Comandatuba',
      src: 'https://www.google.com/maps?output=embed&saddr=Aeroporto+Jorge+Amado,+Ilheus,+BA&daddr=Hotel+Transamerica+Comandatuba,+Una,+BA'
    },
    goiania: {
      pt: 'Mapa interativo: rota de carro de Goiânia até Hotel Transamerica Comandatuba',
      en: 'Interactive map: driving route from Goiânia to Hotel Transamerica Comandatuba',
      src: 'https://www.google.com/maps?output=embed&saddr=Goiania,+GO,+Brazil&daddr=Hotel+Transamerica+Comandatuba,+Una,+BA,+Brazil'
    }
  };
  document.querySelectorAll('[data-map-view]').forEach(button => {
    button.addEventListener('click', () => {
      const view = views[button.dataset.mapView];
      if (!view) return;
      document.querySelectorAll('[data-map-view]').forEach(tab => {
        const active = tab === button;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-pressed', String(active));
      });
      mapFrame.title = view[document.documentElement.lang === 'en' ? 'en' : 'pt'];
      mapFrame.src = view.src;
    });
  });
})();
