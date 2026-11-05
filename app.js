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
  const appShell = document.getElementById('appShell');
  const restoreButton = document.getElementById('restoreEditor');
  let active = 'home';

  function closeMenu() {
    sidebar.classList.remove('open'); scrim.classList.remove('show');
    menuButton.setAttribute('aria-expanded', 'false');
  }
  function navigate(id, updateHash = true) {
    if (id !== 'home' && !apps[id]) id = 'home';
    active = id;
    appShell.classList.remove('editor-maximized');
    restoreButton.hidden = true;
    document.getElementById('openNewTab').setAttribute('aria-pressed', 'false');
    document.getElementById('openNewTab').title = 'Maximize editor';
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
  document.getElementById('openNewTab').addEventListener('click', () => {
    if (active === 'home') return;
    appShell.classList.add('editor-maximized');
    restoreButton.hidden = false;
    document.getElementById('openNewTab').setAttribute('aria-pressed', 'true');
    document.getElementById('openNewTab').title = 'Editor maximized';
  });
  let restorePointer = null;
  let restorePressTimer = null;
  let restoreDragging = false;

  function setRestorePosition(x, y) {
    const maxX = Math.max(8, window.innerWidth - restoreButton.offsetWidth - 8);
    const maxY = Math.max(8, window.innerHeight - restoreButton.offsetHeight - 8);

    x = Math.max(8, Math.min(x, maxX));
    y = Math.max(8, Math.min(y, maxY));

    restoreButton.style.left = `${x}px`;
    restoreButton.style.top = `${y}px`;
    restoreButton.style.right = 'auto';
    restoreButton.style.bottom = 'auto';

    return { x, y };
  }

  function saveRestorePosition(x, y) {
    try {
      localStorage.setItem('craftsuite.restorePosition', JSON.stringify({ x, y }));
    } catch (_) {}
  }

  function loadRestorePosition() {
    try {
      const saved = JSON.parse(localStorage.getItem('craftsuite.restorePosition'));
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
        restoreButton.style.left = `${saved.x}px`;
        restoreButton.style.top = `${saved.y}px`;
        restoreButton.style.right = 'auto';
        restoreButton.style.bottom = 'auto';
      }
    } catch (_) {}
  }

  loadRestorePosition();

  function cancelRestorePress() {
    if (restorePressTimer !== null) {
      clearTimeout(restorePressTimer);
      restorePressTimer = null;
    }
  }

  restoreButton.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;

    const rect = restoreButton.getBoundingClientRect();

    restorePointer = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: rect.left,
      top: rect.top,
      cancelled: false
    };

    restoreDragging = false;
    restoreButton.setPointerCapture(event.pointerId);

    restorePressTimer = setTimeout(() => {
      if (!restorePointer || restorePointer.id !== event.pointerId) return;
      if (restorePointer.cancelled) return;

      restoreDragging = true;
      restoreButton.classList.add('is-dragging');
    }, 450);
  });

  restoreButton.addEventListener('pointermove', event => {
    if (!restorePointer || event.pointerId !== restorePointer.id) return;

    const dx = event.clientX - restorePointer.startX;
    const dy = event.clientY - restorePointer.startY;

    if (!restoreDragging && Math.hypot(dx, dy) > 10) {
      cancelRestorePress();
      restorePointer.cancelled = true;
      return;
    }

    if (restoreDragging) {
      setRestorePosition(restorePointer.left + dx, restorePointer.top + dy);
    }
  });

  function finishRestorePointer(event) {
    if (!restorePointer || event.pointerId !== restorePointer.id) return;

    cancelRestorePress();

    if (restoreDragging) {
      const rect = restoreButton.getBoundingClientRect();
      const position = setRestorePosition(rect.left, rect.top);
      saveRestorePosition(position.x, position.y);
    } else if (!restorePointer.cancelled) {
      appShell.classList.remove('editor-maximized');
      restoreButton.hidden = true;
      document.getElementById('openNewTab').setAttribute('aria-pressed', 'false');
      document.getElementById('openNewTab').title = 'Maximize editor';
    }

    restoreButton.classList.remove('is-dragging');
    restoreDragging = false;
    restorePointer = null;
  }

  restoreButton.addEventListener('pointerup', finishRestorePointer);

  restoreButton.addEventListener('pointercancel', event => {
    if (!restorePointer || event.pointerId !== restorePointer.id) return;

    cancelRestorePress();

    if (restoreDragging) {
      const rect = restoreButton.getBoundingClientRect();
      const position = setRestorePosition(rect.left, rect.top);
      saveRestorePosition(position.x, position.y);
    }

    restoreButton.classList.remove('is-dragging');
    restoreDragging = false;
    restorePointer = null;
  });

  window.addEventListener('resize', () => {
    if (restoreButton.hidden) return;
    const rect = restoreButton.getBoundingClientRect();
    const position = setRestorePosition(rect.left, rect.top);
    saveRestorePosition(position.x, position.y);
  });
  document.getElementById('reloadEditor').addEventListener('click', () => { if (active !== 'home') frame.src = apps[active].path; });
  menuButton.addEventListener('click', () => {
    const open = !sidebar.classList.contains('open');
    sidebar.classList.toggle('open', open); scrim.classList.toggle('show', open);
    menuButton.setAttribute('aria-expanded', String(open));
  });
  scrim.addEventListener('click', closeMenu);
  window.addEventListener('hashchange', () => navigate(location.hash.slice(1) || 'home', false));
  navigate(location.hash.slice(1) || 'home', false);
})();
