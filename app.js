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

  let wordCraftFontSeed = null;

  function seedWordCraftFonts() {
    if (wordCraftFontSeed) return wordCraftFontSeed;

    wordCraftFontSeed = (async () => {
      const response = await fetch('./assets/fonts/manifest.json');
      if (!response.ok) throw new Error(`Font manifest: HTTP ${response.status}`);

      const paths = await response.json();
      if (!Array.isArray(paths)) throw new Error('Invalid font manifest');

      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('wordcraft', 1);
        request.onupgradeneeded = () => {
          const database = request.result;
          if (!database.objectStoreNames.contains('fonts')) {
            database.createObjectStore('fonts');
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      try {
        const existing = await new Promise((resolve, reject) => {
          const transaction = db.transaction('fonts', 'readonly');
          const request = transaction.objectStore('fonts').getAllKeys();
          request.onsuccess = () => resolve(new Set(request.result));
          request.onerror = () => reject(request.error);
          transaction.onerror = () => reject(transaction.error);
        });

        const missing = paths.filter(path => !existing.has(path.split('/').pop()));

        if (!missing.length) {
          console.info('CraftSuite fonts: all bundled fonts already installed.');
          return;
        }

        const files = await Promise.all(missing.map(async path => {
          const fileResponse = await fetch(`./${path}`);
          if (!fileResponse.ok) {
            throw new Error(`Could not fetch ${path}: HTTP ${fileResponse.status}`);
          }
          return [path.split('/').pop(), new Uint8Array(await fileResponse.arrayBuffer())];
        }));

        await new Promise((resolve, reject) => {
          const transaction = db.transaction('fonts', 'readwrite');
          const store = transaction.objectStore('fonts');

          for (const [name, bytes] of files) {
            store.put(bytes, name);
          }

          transaction.oncomplete = resolve;
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error || new Error('Font installation aborted'));
        });

        console.info(`CraftSuite fonts: installed ${files.length} bundled fonts.`);
      } finally {
        db.close();
      }
    })().catch(error => {
      wordCraftFontSeed = null;
      console.error('CraftSuite font installation failed:', error);
    });

    return wordCraftFontSeed;
  }

  function loadEditorFrame(id) {
    const path = apps[id].path;

    if (id !== 'wordcraft') {
      frame.src = path;
      return;
    }

    frame.removeAttribute('src');
    seedWordCraftFonts().finally(() => {
      if (active === 'wordcraft') frame.src = path;
    });
  }

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
      if (frame.getAttribute('src') !== app.path) loadEditorFrame(id);
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
    positionRestoreButton();
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

  function positionRestoreButton() {
    const rect = restoreButton.getBoundingClientRect();
    const position = setRestorePosition(rect.left, rect.top);
    saveRestorePosition(position.x, position.y);
  }

  function loadRestorePosition() {
    try {
      const saved = JSON.parse(localStorage.getItem('craftsuite.restorePosition'));
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
        setRestorePosition(saved.x, saved.y);
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

  function resetRestoreInteraction() {
    cancelRestorePress();
    restoreButton.classList.remove('is-dragging');
    restoreDragging = false;
    restorePointer = null;
  }

  function restoreEditorLayout() {
    appShell.classList.remove('editor-maximized');
    restoreButton.hidden = true;
    document.getElementById('openNewTab').setAttribute('aria-pressed', 'false');
    document.getElementById('openNewTab').title = 'Maximize editor';
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
      moved: false
    };

    restoreDragging = false;

    try {
      restoreButton.setPointerCapture(event.pointerId);
    } catch (_) {}

    restorePressTimer = setTimeout(() => {
      if (!restorePointer || restorePointer.id !== event.pointerId) return;
      if (restorePointer.moved) return;

      restoreDragging = true;
      restoreButton.classList.add('is-dragging');
    }, 450);
  });

  restoreButton.addEventListener('pointermove', event => {
    if (!restorePointer || event.pointerId !== restorePointer.id) return;

    const dx = event.clientX - restorePointer.startX;
    const dy = event.clientY - restorePointer.startY;

    if (!restoreDragging && Math.hypot(dx, dy) > 10) {
      restorePointer.moved = true;
      cancelRestorePress();
      return;
    }

    if (restoreDragging) {
      setRestorePosition(restorePointer.left + dx, restorePointer.top + dy);
    }
  });

  function finishRestorePointer(event) {
    if (!restorePointer || event.pointerId !== restorePointer.id) return;

    if (restoreDragging) {
      const rect = restoreButton.getBoundingClientRect();
      const position = setRestorePosition(rect.left, rect.top);
      saveRestorePosition(position.x, position.y);
    } else {
      restoreEditorLayout();
    }

    resetRestoreInteraction();
  }

  restoreButton.addEventListener('pointerup', finishRestorePointer);

  restoreButton.addEventListener('pointercancel', event => {
    if (!restorePointer || event.pointerId !== restorePointer.id) return;

    if (restoreDragging) {
      const rect = restoreButton.getBoundingClientRect();
      const position = setRestorePosition(rect.left, rect.top);
      saveRestorePosition(position.x, position.y);
    }

    resetRestoreInteraction();
  });

  restoreButton.addEventListener('lostpointercapture', () => {
    if (restorePointer) resetRestoreInteraction();
  });

  restoreButton.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      restoreEditorLayout();
    }
  });

  function keepRestoreButtonVisible() {
    if (restoreButton.hidden) return;
    positionRestoreButton();
  }

  window.addEventListener('resize', keepRestoreButtonVisible);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', keepRestoreButtonVisible);
  }
  document.getElementById('reloadEditor').addEventListener('click', () => { if (active !== 'home') loadEditorFrame(active); });
  menuButton.addEventListener('click', () => {
    const open = !sidebar.classList.contains('open');
    sidebar.classList.toggle('open', open); scrim.classList.toggle('show', open);
    menuButton.setAttribute('aria-expanded', String(open));
  });
  scrim.addEventListener('click', closeMenu);
  window.addEventListener('hashchange', () => navigate(location.hash.slice(1) || 'home', false));
  navigate(location.hash.slice(1) || 'home', false);
})();
