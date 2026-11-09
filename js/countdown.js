window.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('countdown');
  if (!root) return;
  const target = new Date(root.dataset.date).getTime();
  const update = () => {
    const diff = Math.max(0, target - Date.now());
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor(diff % 86400000 / 3600000);
    const minutes = Math.floor(diff % 3600000 / 60000);
    document.getElementById('days').textContent = days;
    document.getElementById('hours').textContent = String(hours).padStart(2,'0');
    document.getElementById('minutes').textContent = String(minutes).padStart(2,'0');
  };
  update(); setInterval(update, 60000);
});