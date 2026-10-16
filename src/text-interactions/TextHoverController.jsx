import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { wordAt, wordPose, REST_POSE } from './word-motion';
import './text-interactions.css';

const ELIGIBLE = 'h1,h2,h3,h4,h5,h6,p,a,button,.fn-brand-word,.sj-tags span,.tech-tags span,.card-eyebrow,.eyebrow,.availability';
const EXCLUDED = 'input,textarea,select,option,label,pre,code,kbd,samp,svg,canvas,video,iframe,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[hidden],[inert],[aria-hidden="true"],.sr-only,.hero-headline,.hero-artwork,.ra-gallery,.ra-selected-info,.mf-brand-visual,.sj-node,.marquee,.admin-layout,[data-magnetic="off"]';
const FONT_PROPERTIES = ['fontFamily','fontSize','fontWeight','fontStyle','fontStretch','fontVariant','fontFeatureSettings','fontVariationSettings','fontKerning','fontOpticalSizing','letterSpacing','wordSpacing','textTransform','textRendering','color','direction','writingMode','textDecorationLine','textDecorationStyle','textDecorationColor','textDecorationThickness','textUnderlineOffset'];

// Paint only the hovered range in an aria-hidden overlay. Never split or replace React's text nodes.
export function installTextHover(scope, layer) {
    if (!scope || !layer) return undefined;
    const capability = matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) and (forced-colors: none)');
    const records = new Set();
    let enabled = false, down = false, active = null, raf = 0, pending = null;
    const supportsWords = Boolean(window.CSS?.highlights && window.Highlight && (document.caretPositionFromPoint || document.caretRangeFromPoint) && Element.prototype.animate);
    const syncHighlights = () => {
      if (!supportsWords) return;
      if (records.size) CSS.highlights.set('premium-magnetic-word', new Highlight(...[...records].map(record => record.range)));
      else CSS.highlights.delete('premium-magnetic-word');
    };
    const remove = record => {
      if (!records.has(record)) return;
      records.delete(record); record.animation?.cancel(); record.overlay.remove();
      if (active === record) active = null;
      syncHighlights();
    };
    const clear = () => {
      cancelAnimationFrame(raf); raf = 0; pending = null;
      for (const record of [...records]) remove(record);
    };
    const retire = record => {
      if (!record || record.retiring) return;
      if (active === record) active = null;
      record.retiring = true;
      const from = getComputedStyle(record.overlay).transform;
      record.animation?.cancel(); record.overlay.style.transform = REST_POSE;
      record.animation = record.overlay.animate([{ transform: from }, { transform: REST_POSE }], { duration: 300, easing: 'cubic-bezier(.2,.75,.25,1)', fill: 'forwards' });
      record.animation.onfinish = () => remove(record);
    };
    const hasSelection = () => Boolean(window.getSelection()?.toString());
    const safeElement = element => {
      if (!scope.contains(element) || element.closest(EXCLUDED) || !element.closest(ELIGIBLE)) return false;
      // Scaling/rotation and active ancestor animations would make a fixed overlay misalign.
      for (let parent = element; parent && parent !== scope; parent = parent.parentElement) {
        if (parent.getAnimations().some(animation => animation.playState === 'running')) return false;
        const transform = getComputedStyle(parent).transform;
        if (transform !== 'none') {
          const matrix = new DOMMatrixReadOnly(transform);
          if (!matrix.is2D || Math.abs(matrix.a - 1) > .001 || Math.abs(matrix.d - 1) > .001 || Math.abs(matrix.b) > .001 || Math.abs(matrix.c) > .001) return false;
        }
      }
      return true;
    };
    const hitWord = point => {
      if (!(point.target instanceof Element) || !safeElement(point.target)) return null;
      const caret = document.caretPositionFromPoint?.(point.x, point.y);
      const legacy = !caret && document.caretRangeFromPoint?.(point.x, point.y);
      const node = caret?.offsetNode || legacy?.startContainer, offset = caret?.offset ?? legacy?.startOffset;
      if (node?.nodeType !== Node.TEXT_NODE || !node.parentElement || !safeElement(node.parentElement)) return null;
      const word = wordAt(node.data, offset);
      if (!word) return null;
      const range = document.createRange(); range.setStart(node, word.start); range.setEnd(node, word.end);
      const boxes = [...range.getClientRects()];
      if (boxes.length !== 1) return null;
      const box = boxes[0];
      if (!box.width || point.x < box.left || point.x > box.right || point.y < box.top || point.y > box.bottom) return null;
      const style = getComputedStyle(node.parentElement);
      if (style.writingMode !== 'horizontal-tb' || style.color === 'rgba(0, 0, 0, 0)' || style.webkitTextFillColor === 'transparent') return null;
      return { node, word, range, box, style, element: node.parentElement };
    };
    const paint = () => {
      raf = 0;
      if (!enabled || !pending || down || hasSelection()) { clear(); return; }
      try {
        const hit = hitWord(pending);
        if (!hit) { retire(active); return; }
        if (active && active.node === hit.node && active.word.start === hit.word.start && active.word.end === hit.word.end) {
          active.overlay.style.transform = wordPose(hit.box, pending, active.heading, active.body); return;
        }
        retire(active);
        const returning = [...records].find(record => record.node === hit.node && record.word.start === hit.word.start && record.word.end === hit.word.end);
        if (returning) {
          const from = getComputedStyle(returning.overlay).transform;
          returning.animation?.cancel(); returning.retiring = false; active = returning;
          const pose = wordPose(hit.box, pending, returning.heading, returning.body);
          returning.overlay.style.transform = pose;
          returning.animation = returning.overlay.animate([{ transform: from }, { transform: pose }], { duration: 280, easing: 'cubic-bezier(.2,.75,.25,1)' });
          returning.animation.onfinish = () => { returning.animation = null; };
          return;
        }
        // A small fixed budget handles quick word changes without accumulating overlay nodes.
        while (records.size >= 5) remove(records.values().next().value);
        const overlay = document.createElement('span'); overlay.className = 'pti-word'; overlay.textContent = hit.range.toString();
        for (const property of FONT_PROPERTIES) overlay.style[property] = hit.style[property];
        overlay.style.lineHeight = hit.style.lineHeight;
        overlay.style.textShadow = hit.style.textShadow;
        overlay.style.left = `${hit.box.left}px`; overlay.style.top = `${hit.box.top}px`;
        layer.appendChild(overlay);
        // Align glyph metrics, including italics and font-specific ascenders, rather than guessing a baseline.
        const metrics = document.createRange(); metrics.selectNodeContents(overlay);
        const paintedBox = metrics.getBoundingClientRect();
        overlay.style.left = `${hit.box.left + hit.box.left - paintedBox.left}px`;
        overlay.style.top = `${hit.box.top + hit.box.top - paintedBox.top}px`;
        const record = { ...hit, overlay, heading: Boolean(hit.element.closest('h1,h2,h3,h4,h5,h6')), body: Boolean(hit.element.closest('p')), retiring: false };
        records.add(record); active = record; syncHighlights();
        const pose = wordPose(hit.box, pending, record.heading, record.body);
        overlay.style.transform = pose;
        record.animation = overlay.animate([{ transform: REST_POSE }, { transform: pose }], { duration: 320, easing: 'cubic-bezier(.2,.75,.25,1)' });
        record.animation.onfinish = () => { record.animation = null; };
      } catch { clear(); }
    };
    const move = event => {
      if (!enabled || !supportsWords || event.pointerType !== 'mouse' || event.buttons || down) return;
      pending = { x: event.clientX, y: event.clientY, target: event.target };
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const leave = () => { cancelAnimationFrame(raf); raf = 0; pending = null; retire(active); };
    const press = () => { down = true; scope.classList.add('pti-selecting'); clear(); };
    const release = () => { down = false; scope.classList.remove('pti-selecting'); };
    const keyboard = () => { scope.classList.remove('pti-pointer'); clear(); };
    const activatePointer = event => { if (enabled && event.pointerType === 'mouse') scope.classList.add('pti-pointer'); move(event); };
    const update = () => {
      enabled = capability.matches && !document.hidden;
      scope.classList.toggle('pti-enabled', enabled);
      if (!enabled) { scope.classList.remove('pti-pointer'); release(); clear(); }
    };
    const selection = () => { if (hasSelection()) clear(); };
    update(); capability.addEventListener('change', update); document.addEventListener('visibilitychange', update);
    scope.addEventListener('pointermove', activatePointer, { passive: true }); scope.addEventListener('pointerleave', leave);
    scope.addEventListener('pointerdown', press, { passive: true }); window.addEventListener('pointerup', release, { passive: true }); window.addEventListener('pointercancel', release);
    document.addEventListener('selectionchange', selection); document.addEventListener('keydown', keyboard);
    window.addEventListener('scroll', clear, { passive: true, capture: true }); window.addEventListener('resize', clear); window.addEventListener('blur', clear);
    document.fonts?.addEventListener('loadingdone', clear);
    // React may replace dynamic text or unmount a panel without pointer movement.
    const observer = new MutationObserver(clear); observer.observe(scope, { childList: true, characterData: true, subtree: true });
    return () => {
      clear(); observer.disconnect(); scope.classList.remove('pti-enabled', 'pti-pointer', 'pti-selecting');
      capability.removeEventListener('change', update); document.removeEventListener('visibilitychange', update);
      scope.removeEventListener('pointermove', activatePointer); scope.removeEventListener('pointerleave', leave); scope.removeEventListener('pointerdown', press);
      window.removeEventListener('pointerup', release); window.removeEventListener('pointercancel', release); document.removeEventListener('selectionchange', selection); document.removeEventListener('keydown', keyboard);
      window.removeEventListener('scroll', clear, true); window.removeEventListener('resize', clear); window.removeEventListener('blur', clear);
      document.fonts?.removeEventListener('loadingdone', clear);
    };
}

export default function TextHoverController({ scopeRef }) {
  const layerRef = useRef(null);
  useEffect(() => installTextHover(scopeRef.current, layerRef.current), [scopeRef]);
  return typeof document === 'undefined' ? null : createPortal(<div ref={layerRef} className="pti-layer" aria-hidden="true" inert/>, document.body);
}
