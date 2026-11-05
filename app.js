(() => {
  'use strict';
  const apps = {
    wordcraft: { name: 'WordCraft', type: 'DOCUMENT EDITOR', path: './public/apps/wordcraft/index.html' },
    gridcraft: { name: 'GridCraft', type: 'SPREADSHEET EDITOR', path: './public/apps/gridcraft/index.html' },
    deckcraft: { name: 'DeckCraft', type: 'PRESENTATION EDITOR', path: './public/apps/deckcraft/index.html' },
    pdfcraft: { name: 'PdfCraft', type: 'PDF WORKSPACE', path: './public/apps/pdfcraft/index.html' }
  };
  const homeView = document.getElementById('homeView');
  const editorView = document.getElementById('editorView');
  const frame = document.getElementById('editorFrame');
  const sidebar = document.getElementById('sidebar');
  const scrim = document.getElementById('scrim');
  const menuButton = document.getElementById('menuButton');
  let active = 'home';

  function closeMenu() {
    sidebar.classList.remove('open'); scrim.classList.remove('show');
    menuButton.setAttribute('aria-expanded', 'false');
  }
  function navigate(id, updateHash = true) {
    if (id !== 'home' && !apps[id]) id = 'home';
    active = id;
    document.querySelectorAll('[data-app]').forEach(el => el.classList.toggle('active', el.dataset.app === id && el.classList.contains('nav-item')));
    if (id === 'home') {
      homeView.hidden = false; editorView.hidden = true;
      frame.removeAttribute('src');
      document.getElementById('crumbCurrent').textContent = 'Home';
      document.getElementById('openNewTab').hidden = true;
      document.title = 'CraftSuite — Your creative workspace';
    } else {
      const app = apps[id];
      homeView.hidden = true; editorView.hidden = false;
      document.getElementById('crumbCurrent').textContent = app.name;
      document.getElementById('editorTitle').textContent = app.name;
      document.getElementById('editorType').textContent = app.type;
      document.getElementById('directLink').href = app.path;
      document.getElementById('openNewTab').hidden = false;
      document.title = `${app.name} — CraftSuite`;
      if (frame.getAttribute('src') !== app.path) frame.src = app.path;
      try { localStorage.setItem('craftsuite.lastApp', id); } catch (_) {}
    }
    if (updateHash) history.replaceState(null, '', id === 'home' ? '#home' : `#${id}`);
    closeMenu();
  }
  document.querySelectorAll('[data-app]').forEach(el => el.addEventListener('click', () => navigate(el.dataset.app)));
  document.getElementById('backHome').addEventListener('click', () => navigate('home'));
  document.getElementById('reloadEditor').addEventListener('click', () => { if (active !== 'home') frame.src = apps[active].path; });
  document.getElementById('openNewTab').addEventListener('click', () => { if (active !== 'home') window.open(apps[active].path, '_blank', 'noopener'); });
  menuButton.addEventListener('click', () => {
    const open = !sidebar.classList.contains('open');
    sidebar.classList.toggle('open', open); scrim.classList.toggle('show', open);
    menuButton.setAttribute('aria-expanded', String(open));
  });
  scrim.addEventListener('click', closeMenu);
  window.addEventListener('hashchange', () => navigate(location.hash.slice(1) || 'home', false));
  navigate(location.hash.slice(1) || 'home', false);
})();
