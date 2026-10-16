import React, { useId, useRef } from 'react';
import './hero-mind.css';

const words = ['AI', 'Innovation', 'Automation', 'Creativity', 'Learning'];

function StillSculpture() {
  const id = useId().replace(/:/g, '');
  return <svg className="hic-still" viewBox="0 0 600 600" fill="none" aria-hidden="true">
    <defs>
      <radialGradient id={`${id}-core`} cx=".32" cy=".2" r=".85"><stop stopColor="#858e9a"/><stop offset=".36" stopColor="#303945"/><stop offset="1" stopColor="#101620"/></radialGradient>
      <linearGradient id={`${id}-metal`} x1="140" y1="120" x2="430" y2="460" gradientUnits="userSpaceOnUse"><stop stopColor="#858e9a"/><stop offset=".28" stopColor="#f1e8d8"/><stop offset=".5" stopColor="#85745b"/><stop offset=".75" stopColor="#dcc6a2"/><stop offset="1" stopColor="#343b44"/></linearGradient>
    </defs>
    <ellipse cx="300" cy="475" rx="118" ry="12" fill="#000" opacity=".2"/>
    <path d="M300 200 372 246 380 333 309 387 228 342 220 255Z" fill={`url(#${id}-core)`} stroke="#858e9a" strokeOpacity=".4"/>
    <path d="m300 200-8 92 88 41m-88-41-64 50m64-50 80-46m-80 46 17 95" stroke="#dcc6a2" strokeOpacity=".24"/>
    {[[-35,0],[38,1],[95,2]].map(([angle,i]) => <g key={angle} transform={`rotate(${angle} 300 300)`}><ellipse cx="300" cy="300" rx={170-i*12} ry={76+i*6} stroke={`url(#${id}-metal)`} strokeWidth={i===1?12:7}/><ellipse cx="300" cy="300" rx={183-i*12} ry={89+i*6} stroke="#dcc6a2" strokeOpacity=".22" strokeWidth=".7"/></g>)}
    {[[143,214],[433,343],[353,151],[205,425],[456,230],[331,448]].map(([x,y]) => <circle key={x} cx={x} cy={y} r="2" fill="#dcc6a2" opacity=".65" style={{'--hic-dx':`${(x-300)*.09}px`,'--hic-dy':`${(y-300)*.09}px`}}/>)}
  </svg>;
}

export default function HeroMindJourney() {
  const region = useRef(null);
  const move = event => {
    if (event.pointerType === 'touch' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const node = region.current, box = node.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, (event.clientX - box.left) / box.width * 2 - 1));
    const y = Math.max(-1, Math.min(1, (event.clientY - box.top) / box.height * 2 - 1));
    node.style.setProperty('--hic-tilt-x', `${(-y * 7).toFixed(2)}deg`);
    node.style.setProperty('--hic-tilt-y', `${(x * 9).toFixed(2)}deg`);
    node.style.setProperty('--hic-light-x', `${((x + 1) * 50).toFixed(1)}%`);
    node.style.setProperty('--hic-light-y', `${((y + 1) * 50).toFixed(1)}%`);
    node.classList.add('hic-interacting');
  };
  const reset = () => {
    const node = region.current;
    if (!node) return;
    node.classList.remove('hic-interacting');
    node.style.setProperty('--hic-tilt-x', '0deg');
    node.style.setProperty('--hic-tilt-y', '0deg');
  };
  return <div ref={region} className="hic-visual" role="img" aria-label="Floating dark metallic sculpture with interwoven champagne ribbons and softly illuminated neural paths" onPointerMove={move} onPointerEnter={move} onPointerLeave={reset} onPointerCancel={reset}>
    <div className="hic-atmosphere" aria-hidden="true"/>
    <div className="hic-sculpture"><StillSculpture/></div>
    <div className="hic-words" aria-hidden="true">{words.map(word=><span key={word}>{word}</span>)}</div>
  </div>;
}
