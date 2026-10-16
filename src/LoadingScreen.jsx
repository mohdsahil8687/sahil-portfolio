import React, { useEffect, useRef, useState } from 'react';
import { Activity, Cpu, Orbit } from 'lucide-react';
import './loading-screen.css';

const SESSION_KEY = 'sahil-portfolio-loader-shown';
const PARTICLES = Array.from({ length: 18 }, (_, index) => index);

function shouldShowLoader() {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) !== 'shown';
  } catch {
    return true;
  }
}

export default function LoadingScreen() {
  const [visible, setVisible] = useState(shouldShowLoader);
  const [progress, setProgress] = useState(0);
  const [dotCount, setDotCount] = useState(1);
  const readyRef = useRef(document.readyState === 'complete');

  useEffect(() => {
    if (!visible) return undefined;
    try { window.sessionStorage.setItem(SESSION_KEY, 'shown'); } catch { /* session storage can be unavailable */ }

    const startedAt = performance.now();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reducedMotion ? 300 : 2200;
    const minimumVisible = reducedMotion ? 300 : 1350;
    let frame = 0;
    let finished = false;

    const markReady = () => { readyRef.current = true; };
    const finish = () => {
      if (finished) return;
      finished = true;
      setProgress(100);
      window.setTimeout(() => setVisible(false), reducedMotion ? 40 : 420);
    };
    const tick = now => {
      const elapsed = now - startedAt;
      const decorativeProgress = Math.max(0, Math.min(99, Math.round((elapsed / duration) * 100)));
      setProgress(decorativeProgress);
      const readyToReveal = readyRef.current && elapsed >= minimumVisible;
      const safetyTimeout = elapsed >= 2800;
      if (readyToReveal || safetyTimeout) finish();
      else frame = requestAnimationFrame(tick);
    };

    window.addEventListener('load', markReady, { once: true });
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('load', markReady);
    };
  }, [visible]);

  useEffect(() => {
    if (!visible || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const dots = window.setInterval(() => setDotCount(current => current === 3 ? 1 : current + 1), 420);
    return () => window.clearInterval(dots);
  }, [visible]);

  if (!visible) return null;
  return <div className="loading-screen" role="status" aria-live="polite" aria-label={`Loading portfolio ${progress}%`}>
    <div className="loading-ambient loading-ambient-one" />
    <div className="loading-ambient loading-ambient-two" />
    <div className="loading-particles" aria-hidden="true">
      {PARTICLES.map(index => <i key={index} style={{ '--particle-index': index }} />)}
    </div>
    <div className="loading-icon loading-icon-one" aria-hidden="true"><Orbit size={21} /></div>
    <div className="loading-icon loading-icon-two" aria-hidden="true"><Cpu size={18} /></div>
    <div className="loading-icon loading-icon-three" aria-hidden="true"><Activity size={19} /></div>
    <div className="loading-content">
      <div className="loading-title" aria-label="loading"><span>loading</span><span className="loading-dots" aria-hidden="true">{'.'.repeat(dotCount)}</span></div>
      <div className="loading-details">
      <div className="loading-meta"><span>DESIGN · DEVELOPMENT · AI</span><strong>{String(progress).padStart(2, '0')}%</strong></div>
      <div className="loading-track" aria-hidden="true"><span style={{ transform: `scaleX(${progress / 100})` }} /></div></div>
    </div>
  </div>;
}
