(() => {
  'use strict';

  const selectionStyle = document.createElement('style');
  selectionStyle.textContent = 'html, body, body *, canvas { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }';
  document.head.append(selectionStyle);

  const movementThreshold = 8;
  const doubleTapDistance = 32;
  const doubleTapWindow = 320;
  const longPressDelay = 500;
  const syntheticEvents = new WeakSet();
  let activeTouch = null;
  let pendingTap = null;

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

  function dispatchTap(target, x, y, pointerId, detail) {
    const id = Number.isInteger(pointerId) ? pointerId : 1;

    if (typeof PointerEvent === 'function') {
      const options = {
        bubbles: true,
        cancelable: true,
        pointerId: id,
        pointerType: 'touch',
        isPrimary: true,
        button: 0,
        clientX: x,
        clientY: y,
        detail
      };
      dispatchSynthetic(target, new PointerEvent('pointerdown', { ...options, buttons: 1 }));
      dispatchSynthetic(target, new PointerEvent('pointerup', { ...options, buttons: 0 }));
    } else {
      const options = { bubbles: true, cancelable: true, button: 0, clientX: x, clientY: y, detail };
      dispatchSynthetic(target, new MouseEvent('mousedown', { ...options, buttons: 1 }));
      dispatchSynthetic(target, new MouseEvent('mouseup', { ...options, buttons: 0 }));
    }

    dispatchSynthetic(target, new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      detail,
      clientX: x,
      clientY: y
    }));
  }

  function dispatchSelection(target, first, second, pointerId) {
    dispatchTap(target, first.x, first.y, first.pointerId ?? pointerId, 1);
    dispatchTap(target, second.x, second.y, pointerId, 2);
    dispatchSynthetic(target, new MouseEvent('dblclick', {
      bubbles: true,
      cancelable: true,
      detail: 2,
      clientX: second.x,
      clientY: second.y
    }));
  }

  function clearPendingTap() {
    if (!pendingTap) return;
    clearTimeout(pendingTap.timer);
    pendingTap = null;
  }

  function panBy(x, y) {
    const touch = activeTouch;
    if (!touch) return;

    const deltaX = x - touch.lastX;
    const deltaY = y - touch.lastY;

    if (!touch.scrolling && Math.hypot(x - touch.startX, y - touch.startY) >= movementThreshold) {
      touch.scrolling = true;
      clearTimeout(touch.longPressTimer);
      touch.firstTap = null;
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

  function beginTouch(target, x, y, pointerId, touchId = null) {
    let firstTap = null;

    if (pendingTap) {
      const previous = pendingTap;
      clearPendingTap();

      if (Math.hypot(x - previous.x, y - previous.y) <= doubleTapDistance) {
        firstTap = previous;
      } else {
        dispatchTap(previous.target, previous.x, previous.y, previous.pointerId, 1);
      }
    }

    const touch = {
      target,
      startX: x,
      startY: y,
      lastX: x,
      lastY: y,
      pointerId,
      touchId,
      firstTap,
      scrolling: false,
      longPressed: false,
      longPressTimer: null
    };

    activeTouch = touch;
    touch.longPressTimer = setTimeout(() => {
      if (activeTouch !== touch || touch.scrolling) return;
      touch.longPressed = true;
      dispatchSelection(target, { x, y }, { x, y }, pointerId);
    }, longPressDelay);
  }

  function finishTouch() {
    const touch = activeTouch;
    if (!touch) return;

    clearTimeout(touch.longPressTimer);
    activeTouch = null;

    if (touch.scrolling || touch.longPressed) return;

    const tap = {
      target: touch.target,
      x: touch.lastX,
      y: touch.lastY,
      pointerId: touch.pointerId,
      timer: null
    };

    if (touch.firstTap) {
      dispatchSelection(touch.target, touch.firstTap, tap, touch.pointerId);
      return;
    }

    tap.timer = setTimeout(() => {
      if (pendingTap !== tap) return;
      pendingTap = null;
      dispatchTap(tap.target, tap.x, tap.y, tap.pointerId, 1);
    }, doubleTapWindow);
    pendingTap = tap;
  }

  if (typeof PointerEvent === 'function') {
    document.addEventListener('pointerdown', event => {
      if (syntheticEvents.has(event) || event.pointerType !== 'touch') return;

      const canvas = canvasFrom(event.target);
      if (!canvas) return;
      stopEvent(event);

      if (!event.isPrimary) {
        if (activeTouch) {
          clearTimeout(activeTouch.longPressTimer);
          activeTouch = null;
        }
        clearPendingTap();
        return;
      }

      if (activeTouch) {
        clearTimeout(activeTouch.longPressTimer);
        activeTouch = null;
      }

      beginTouch(canvas, event.clientX, event.clientY, event.pointerId);
    }, true);

    document.addEventListener('pointermove', event => {
      if (syntheticEvents.has(event) || event.pointerType !== 'touch' || !activeTouch) return;
      if (activeTouch.pointerId !== event.pointerId) return;

      stopEvent(event);
      panBy(event.clientX, event.clientY);
    }, true);

    document.addEventListener('pointerup', event => {
      if (syntheticEvents.has(event) || event.pointerType !== 'touch' || !activeTouch) return;
      if (activeTouch.pointerId !== event.pointerId) return;

      stopEvent(event);
      finishTouch();
    }, true);

    document.addEventListener('pointercancel', event => {
      if (syntheticEvents.has(event) || event.pointerType !== 'touch' || !activeTouch) return;
      if (activeTouch.pointerId !== event.pointerId) return;

      clearTimeout(activeTouch.longPressTimer);
      activeTouch = null;
      clearPendingTap();
    }, true);

    document.addEventListener('click', event => {
      if (syntheticEvents.has(event) || event.pointerType !== 'touch' || !canvasFrom(event.target)) return;
      stopEvent(event);
    }, true);
  } else {
    document.addEventListener('touchstart', event => {
      if (syntheticEvents.has(event)) return;
      const canvas = canvasFrom(event.target);
      if (!canvas) return;

      stopEvent(event);
      if (event.touches.length !== 1) {
        if (activeTouch) {
          clearTimeout(activeTouch.longPressTimer);
          activeTouch = null;
        }
        clearPendingTap();
        return;
      }

      const touch = event.changedTouches[0];
      beginTouch(canvas, touch.clientX, touch.clientY, touch.identifier, touch.identifier);
    }, { capture: true, passive: false });

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

      stopEvent(event);
      finishTouch();
    }, { capture: true, passive: false });

    document.addEventListener('touchcancel', event => {
      if (syntheticEvents.has(event) || !activeTouch) return;

      const canceledTouch = Array.from(event.changedTouches).some(item => item.identifier === activeTouch.touchId);
      if (!canceledTouch) return;

      clearTimeout(activeTouch.longPressTimer);
      activeTouch = null;
      clearPendingTap();
    }, true);
  }
})();
