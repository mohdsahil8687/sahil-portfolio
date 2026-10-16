import React, { useRef } from 'react';
import './about-portrait.css';

export default function AboutPortrait({ src }) {
  const portrait = useRef(null);

  function resetTilt() {
    portrait.current?.style.removeProperty('--portrait-rotate-x');
    portrait.current?.style.removeProperty('--portrait-rotate-y');
  }

  function tiltPortrait(event) {
    if (event.pointerType === 'touch' || !window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    portrait.current.style.setProperty('--portrait-rotate-x', `${-y * 7}deg`);
    portrait.current.style.setProperty('--portrait-rotate-y', `${x * 8}deg`);
  }

  return (
    <div className="about-photo" ref={portrait} data-magnetic="off" onPointerMove={tiltPortrait} onPointerLeave={resetTilt} onPointerCancel={resetTilt}>
      <div className="about-photo__frame">
        <img
          className="about-photo__image"
          src={src || '/images/IMG_2202.jpg.jpeg'}
          alt="Muhammad Sahil portrait"
          width="1448"
          height="1086"
          loading="lazy"
          decoding="async"
        />
        <div className="portrait-tag">MUHAMMAD SAHIL <span>↗</span></div>
      </div>
    </div>
  );
}
