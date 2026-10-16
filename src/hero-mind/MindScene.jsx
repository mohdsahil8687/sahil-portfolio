import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createIntelligenceCore, disposeIntelligenceCore } from './scene-geometry';

export default function MindScene({ pointerRef, active, reducedMotion, onReady, onError }) {
  const hostRef = useRef(null), runtimeRef = useRef(null), optionsRef = useRef(null);
  optionsRef.current = { active, reducedMotion, onReady, onError };
  useEffect(() => {
    const host = hostRef.current;
    let renderer, world, environment, observer, raf = 0, disposed = false, failed = false, last = 0, time = 0, ready = false;
    let x = 0, y = 0, scale = 1, slowFrames = 0, frames = 0;
    const compact = host.clientWidth < 480 || (navigator.hardwareConcurrency || 8) <= 4;
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(38, 1, .1, 30);
    const stop = () => { cancelAnimationFrame(raf); raf = 0; last = 0; };
    const fail = () => { if (!disposed && !failed) { failed = true; stop(); optionsRef.current.onError(); } };
    const lost = event => { event.preventDefault(); fail(); };
    const schedule = () => { if (!disposed && !failed && optionsRef.current.active && !raf) raf = requestAnimationFrame(render); };
    function render(timestamp) {
      raf = 0; if (disposed || failed || !optionsRef.current.active) return;
      try {
        const elapsed = last ? (timestamp - last) / 1000 : 1 / 60, dt = Math.min(.05, elapsed); last = timestamp;
        const reduced = optionsRef.current.reducedMotion, pointer = pointerRef.current;
        if (!reduced) time += dt;
        const inside = pointer.inside && !reduced, weight = 1 - Math.exp(-7 * dt);
        const targetScale = inside ? 1.07 - .1 * Math.min(1, Math.hypot(pointer.x, pointer.y)) : 1;
        x += ((inside ? pointer.x : 0) - x) * weight; y += ((inside ? pointer.y : 0) - y) * weight; scale += (targetScale - scale) * weight;
        if (reduced) { x = 0; y = 0; scale = 1; }
        world.update(reduced ? 0 : time, x, y, scale, reduced); renderer.render(scene, camera);
        if (!ready) { ready = true; optionsRef.current.onReady(); }
        if (!reduced && frames < 100) { frames++; if (elapsed > .028) slowFrames++; if (frames === 100 && slowFrames > 35) renderer.setPixelRatio(1); }
        if (!reduced) schedule();
      } catch { fail(); }
    }
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !compact, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, compact ? 1.25 : 1.5)); renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
      host.appendChild(renderer.domElement); renderer.domElement.addEventListener('webglcontextlost', lost);
      const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
      try { environment = pmrem.fromScene(room, .04); scene.environment = environment.texture; } finally { room.dispose(); pmrem.dispose(); }
      scene.add(new THREE.HemisphereLight('#f1e8d8', '#151b24', 1.8));
      const key = new THREE.DirectionalLight('#f1e8d8', 3.3); key.position.set(-3, 4, 5); scene.add(key);
      const rim = new THREE.DirectionalLight('#dcc6a2', 2.4); rim.position.set(3, 1, -2); scene.add(rim);
      world = createIntelligenceCore({ compact }); scene.add(world.root);
      const resize = () => {
        const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight); camera.aspect = width / height;
        // Include the complete sculpture at maximum pointer zoom at every aspect ratio.
        camera.position.z = Math.max(7.5, 2.45 / (Math.tan(THREE.MathUtils.degToRad(19)) * camera.aspect));
        camera.updateProjectionMatrix(); renderer.setSize(width, height, false); schedule();
      };
      observer = new ResizeObserver(resize); observer.observe(host); resize(); runtimeRef.current = { schedule, stop }; schedule();
    } catch { fail(); }
    return () => {
      disposed = true; stop(); observer?.disconnect(); runtimeRef.current = null;
      if (renderer) { renderer.domElement.removeEventListener('webglcontextlost', lost); renderer.domElement.remove(); }
      if (world) disposeIntelligenceCore(world.root); environment?.dispose(); renderer?.dispose();
    };
  }, [pointerRef]);
  useEffect(() => { if (active) runtimeRef.current?.schedule(); else runtimeRef.current?.stop(); }, [active, reducedMotion]);
  return <div ref={hostRef} className="hic-canvas" aria-hidden="true"/>;
}
