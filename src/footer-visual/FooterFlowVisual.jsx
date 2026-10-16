import React, { useEffect, useId, useRef } from 'react';
import './footer-flow.css';

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  x: 50 + Math.cos(i * 2.39996) * (29 + i % 4 * 3.5),
  y: 49 + Math.sin(i * 2.39996) * (28 + i % 3 * 4),
}));

export function flowPose(x, y, inside) {
  const px = Math.max(-1, Math.min(1, x)), py = Math.max(-1, Math.min(1, y));
  return inside ? { x: -py * 7, y: px * 10, open: 1, scale: 1.045 + (1 - Math.min(1, Math.hypot(px, py))) * .015 }
    : { x: 0, y: 0, open: 0, scale: 1 };
}

export function installFooterFlow(root) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  let visible = false, frame = 0, last = 0, target = flowPose(0, 0, false);
  let pose = { ...target };
  const running = () => visible && !document.hidden && !reduced.matches;
  const write = () => {
    root.style.setProperty('--ff-rx', `${pose.x.toFixed(3)}deg`);
    root.style.setProperty('--ff-ry', `${pose.y.toFixed(3)}deg`);
    root.style.setProperty('--ff-open', pose.open.toFixed(4));
    root.style.setProperty('--ff-scale', pose.scale.toFixed(4));
  };
  const stop = () => { cancelAnimationFrame(frame); frame = 0; last = 0; };
  const schedule = () => { if (running() && !frame) frame = requestAnimationFrame(tick); };
  function tick(time) {
    frame = 0;
    if (!running()) return;
    const dt = last ? Math.min(.05, (time - last) / 1000) : 1 / 60;
    last = time;
    const weight = 1 - Math.exp(-9 * dt);
    let unsettled = false;
    for (const key of ['x', 'y', 'open', 'scale']) {
      pose[key] += (target[key] - pose[key]) * weight;
      if (Math.abs(target[key] - pose[key]) > .0005) unsettled = true;
      else pose[key] = target[key];
    }
    write(); if (unsettled) schedule(); else last = 0;
  }
  const move = event => {
    if (!running() || !fine.matches || event.pointerType !== 'mouse') return;
    const box = root.getBoundingClientRect();
    target = flowPose((event.clientX - box.left) / Math.max(1, box.width) * 2 - 1, (event.clientY - box.top) / Math.max(1, box.height) * 2 - 1, true);
    schedule();
  };
  const leave = () => { target = flowPose(0, 0, false); schedule(); };
  const environment = () => {
    root.dataset.running = String(running());
    if (!running() || !fine.matches) { stop(); target = flowPose(0, 0, false); pose = { ...target }; write(); }
  };
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; environment(); }, { threshold: .05 }) : null;
  if (observer) observer.observe(root); else visible = true;
  environment();
  root.addEventListener('pointerenter', move, { passive: true }); root.addEventListener('pointermove', move, { passive: true });
  root.addEventListener('pointerleave', leave); root.addEventListener('pointercancel', leave);
  document.addEventListener('visibilitychange', environment); reduced.addEventListener('change', environment); fine.addEventListener('change', environment);
  return () => {
    stop(); observer?.disconnect(); root.dataset.running = 'false';
    root.removeEventListener('pointerenter', move); root.removeEventListener('pointermove', move); root.removeEventListener('pointerleave', leave); root.removeEventListener('pointercancel', leave);
    document.removeEventListener('visibilitychange', environment); reduced.removeEventListener('change', environment); fine.removeEventListener('change', environment);
  };
}

export default function FooterFlowVisual() {
  const root = useRef(null), id = useId().replace(/:/g, '');
  useEffect(() => installFooterFlow(root.current), []);
  return <div ref={root} className="mf-brand-visual ff-visual" data-magnetic="off" role="img" aria-label="Animated champagne-metal AI sculpture with unfolding ribbons and flowing light trails">
    <div className="mf-brand-scene ff-stage" aria-hidden="true">
      <div className="ff-halo"/><div className="ff-shadow"/>
      <svg className="ff-atmosphere" viewBox="0 0 440 310" fill="none">
        <defs><linearGradient id={`${id}-trail`}><stop stopColor="#dcc6a2" stopOpacity="0"/><stop offset=".5" stopColor="#dcc6a2" stopOpacity=".7"/><stop offset="1" stopColor="#dcc6a2" stopOpacity="0"/></linearGradient></defs>
        <g className="ff-orbits"><ellipse cx="220" cy="155" rx="181" ry="74" transform="rotate(-18 220 155)"/><ellipse cx="220" cy="155" rx="163" ry="106" transform="rotate(30 220 155)"/></g>
        <g stroke={`url(#${id}-trail)`} className="ff-trails"><path d="M46 200C91 134 321 86 396 105"/><path d="M87 67C193 26 348 190 355 250"/></g>
        <g className="ff-type"><text x="58" y="91">CREATIVE FLOW</text><text x="335" y="235">AUTOMATION</text></g>
      </svg>
      <div className="ff-sculpture"><div className="ff-drift">
        <div className="ff-back-orbit"/><div className="ff-back-orbit ff-back-orbit-two"/>
        <div className="ff-iris">
          {Array.from({ length: 8 }, (_, i) => <div key={i} className={`ff-fin ${i % 3 === 0 ? 'ff-fin-silver' : ''}`} style={{ '--ff-i': i }}>
            <svg className="ff-fin-surface" viewBox="0 0 250 250" fill="none">
              <defs><linearGradient id={`${id}-fin-${i}`} x1="67" y1="30" x2="145" y2="134" gradientUnits="userSpaceOnUse"><stop stopColor={i % 3 === 0 ? '#b8c1c9' : '#f1e8d8'}/><stop offset=".23" stopColor={i % 3 === 0 ? '#606c7a' : '#c8b594'}/><stop offset=".53" stopColor="#222b36"/><stop offset=".78" stopColor={i % 3 === 0 ? '#858e9a' : '#a99473'}/><stop offset="1" stopColor="#171e28"/></linearGradient></defs>
              <path d="M125 134C93 120 57 85 67 48C74 19 113 18 135 41C157 64 155 95 139 118L126 134C144 99 137 65 116 51C98 39 81 43 82 61C83 85 104 110 125 134Z" fill={`url(#${id}-fin-${i})`} stroke="#dcc6a2" strokeOpacity=".48" strokeWidth=".6"/>
              <path d="M125 131C98 111 69 80 75 53C79 32 107 29 125 42" stroke="#f1e8d8" strokeOpacity=".44" strokeWidth=".7"/>
              <path className="ff-fin-signal" d="M126 127C143 99 141 68 125 51" stroke="#f1e8d8" strokeWidth="1" strokeLinecap="round"/>
            </svg>
          </div>)}
        </div>
        <div className="ff-core">
          <svg viewBox="0 0 100 100" fill="none"><defs><radialGradient id={`${id}-core`} cx=".32" cy=".2"><stop stopColor="#68717b"/><stop offset=".45" stopColor="#2b3440"/><stop offset="1" stopColor="#101620"/></radialGradient></defs><path d="m50 8 29 13 13 29-13 29-29 13-29-13L8 50l13-29Z" fill={`url(#${id}-core)`} stroke="#dcc6a2" strokeOpacity=".65" strokeWidth=".7"/><path d="m50 8-7 38 49 4M43 46 21 79m22-33 7 46m-7-46L21 21m22 25 36-25m-36 25 36 33" stroke="#dcc6a2" strokeOpacity=".22" strokeWidth=".6"/><circle cx="48" cy="48" r="15" stroke="#dcc6a2" strokeOpacity=".48" strokeWidth=".6"/><path d="m41 51 7-11 7 11m-12-3h10m6-7v10" stroke="#f1e8d8" strokeOpacity=".86" strokeWidth="1.3"/></svg>
        </div>
        <div className="ff-filament"/><div className="ff-filament ff-filament-two"/>
      </div></div>
      <div className="ff-particles">{PARTICLES.map((particle, i) => <i key={i} style={{ left: `${particle.x}%`, top: `${particle.y}%`, '--ff-delay': `${-i * .7}s`, '--ff-dx': `${(particle.x - 50) * .15}px`, '--ff-dy': `${(particle.y - 50) * .15}px` }}/>)}</div>
    </div>
  </div>;
}
