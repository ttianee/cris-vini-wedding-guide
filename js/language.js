(() => {
  const key = 'cris-vini-language';
  let language = localStorage.getItem(key) || 'pt';
  const apply = () => {
    document.documentElement.lang = language === 'pt' ? 'pt-BR' : 'en';
    document.querySelectorAll('[data-pt][data-en]').forEach(el => {
      el.textContent = el.dataset[language];
    });
    const button = document.getElementById('languageSwitch');
    if (button) button.textContent = language === 'pt' ? 'EN' : 'PT';
    document.title = language === 'pt' ? document.title : document.title.replace('Nossa celebração','Our celebration');
  };
  window.addEventListener('DOMContentLoaded', () => {
    apply();
    const button = document.getElementById('languageSwitch');
    if (button) button.addEventListener('click', () => {
      language = language === 'pt' ? 'en' : 'pt';
      localStorage.setItem(key, language);
      apply();
    });
  });
})();