(() => {
  'use strict';

  const selectionStyle = document.createElement('style');
  selectionStyle.textContent = 'html, body, body *, canvas { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }';
  document.head.append(selectionStyle);

  const movementThreshold = 8;
  const syntheticEvents = new WeakSet();
  let activeTouch = null;
  let suppressClick = false;
  let clickResetTimer = null;

  function canvasFrom(target) {
    return target instanceof Element ? target.closest('canvas') : null;
  }

  function stopEvent(event) {
    if (event.cancelable) event.preventDefault();
    event.stopImmediatePropagation();
  }

  function createActiveTouch(target, x, y, pointerId = null, touch = null) {
    return {
      target,
      startX: x,
      startY: y,
      lastX: x,
      lastY: y,
      pointerId,
      touchId: touch?.identifier ?? null,
      initialTouch: touch,
      scrolling: false
    };
  }

  function dispatchSynthetic(target, event) {
    syntheticEvents.add(event);
    target.dispatchEvent(event);
  }

  function cancelEditorTouch() {
    const touch = activeTouch;
    if (!touch) return;

    if (touch.pointerId !== null && typeof PointerEvent === 'function') {
      dispatchSynthetic(touch.target, new PointerEvent('pointercancel', {
        bubbles: true,
        pointerId: touch.pointerId,
        pointerType: 'touch',
        isPrimary: true,
        clientX: touch.lastX,
        clientY: touch.lastY
      }));
    }

    if (touch.initialTouch && typeof TouchEvent === 'function') {
      try {
        dispatchSynthetic(touch.target, new TouchEvent('touchcancel', {
          bubbles: true,
          touches: [],
          targetTouches: [],
          changedTouches: [touch.initialTouch]
        }));
      } catch (error) {
        console.warn('Could not cancel the editor touch interaction:', error);
      }
    }
  }

  function panBy(x, y) {
    const touch = activeTouch;
    if (!touch) return;

    const deltaX = x - touch.lastX;
    const deltaY = y - touch.lastY;

    if (!touch.scrolling && Math.hypot(x - touch.startX, y - touch.startY) >= movementThreshold) {
      touch.scrolling = true;
      cancelEditorTouch();
      const panX = x - touch.startX;
      const panY = y - touch.startY;
      touch.target.dispatchEvent(new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaX: -panX,
        deltaY: -panY,
        clientX: x,
        clientY: y
      }));
    } else if (touch.scrolling && (deltaX || deltaY)) {
      touch.target.dispatchEvent(new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaX: -deltaX,
        deltaY: -deltaY,
        clientX: x,
        clientY: y
      }));
    }

    touch.lastX = x;
    touch.lastY = y;
  }

  function clearActiveTouch() {
    activeTouch = null;
  }

  document.addEventListener('pointerdown', event => {
    if (syntheticEvents.has(event) || event.pointerType !== 'touch' || !event.isPrimary) return;

    const canvas = canvasFrom(event.target);
    if (!canvas) return;

    if (activeTouch?.target === canvas && activeTouch.pointerId === null) {
      activeTouch.pointerId = event.pointerId;
      return;
    }

    activeTouch = createActiveTouch(canvas, event.clientX, event.clientY, event.pointerId);
  }, true);

  document.addEventListener('pointermove', event => {
    if (syntheticEvents.has(event) || event.pointerType !== 'touch' || !activeTouch) return;
    if (activeTouch.pointerId !== null && event.pointerId !== activeTouch.pointerId) return;

    stopEvent(event);
    panBy(event.clientX, event.clientY);
  }, true);

  document.addEventListener('pointerup', event => {
    if (syntheticEvents.has(event) || event.pointerType !== 'touch' || !activeTouch) return;
    if (activeTouch.pointerId !== null && event.pointerId !== activeTouch.pointerId) return;

    if (activeTouch.scrolling) {
      stopEvent(event);
      suppressClick = true;
      clearTimeout(clickResetTimer);
      clickResetTimer = setTimeout(() => { suppressClick = false; }, 0);
    }
  }, true);

  document.addEventListener('pointercancel', event => {
    if (syntheticEvents.has(event) || event.pointerType !== 'touch') return;
    if (!activeTouch || activeTouch.pointerId !== event.pointerId) return;
    clearActiveTouch();
  }, true);

  document.addEventListener('touchstart', event => {
    if (syntheticEvents.has(event)) return;
    if (event.touches.length !== 1) {
      if (activeTouch) cancelEditorTouch();
      clearActiveTouch();
      return;
    }

    const touch = event.changedTouches[0];
    const canvas = canvasFrom(event.target);
    if (!canvas) return;

    if (!activeTouch) {
      activeTouch = createActiveTouch(canvas, touch.clientX, touch.clientY, null, touch);
    } else {
      activeTouch.touchId = touch.identifier;
      activeTouch.initialTouch = touch;
    }
  }, true);

  document.addEventListener('touchmove', event => {
    if (syntheticEvents.has(event) || !activeTouch) return;

    const touch = Array.from(event.changedTouches).find(item => item.identifier === activeTouch.touchId);
    if (!touch) return;

    stopEvent(event);
    panBy(touch.clientX, touch.clientY);
  }, { capture: true, passive: false });

  document.addEventListener('touchend', event => {
    if (syntheticEvents.has(event) || !activeTouch) return;

    const endedTouch = Array.from(event.changedTouches).some(item => item.identifier === activeTouch.touchId);
    if (!endedTouch) return;

    if (activeTouch.scrolling) {
      stopEvent(event);
      suppressClick = true;
      clearTimeout(clickResetTimer);
      clickResetTimer = setTimeout(() => { suppressClick = false; }, 0);
    }

    clearActiveTouch();
  }, true);

  document.addEventListener('touchcancel', event => {
    if (syntheticEvents.has(event) || !activeTouch) return;

    const canceledTouch = Array.from(event.changedTouches).some(item => item.identifier === activeTouch.touchId);
    if (canceledTouch) clearActiveTouch();
  }, true);

  document.addEventListener('click', event => {
    if (!suppressClick || !canvasFrom(event.target)) return;
    stopEvent(event);
    suppressClick = false;
    clearTimeout(clickResetTimer);
  }, true);
})();
