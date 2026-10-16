import * as THREE from 'three';

const TAU = Math.PI * 2;

// Continuous asymmetric ribbon surfaces, each with a restrained twist.
function ribbonGeometry(phase, width, compact) {
  const segments = compact ? 120 : 200, positions = [], indices = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments * TAU;
    for (const side of [-1, 1]) {
      const r = 1.39 + .12 * Math.sin(3 * t + phase) + side * width * Math.cos(t + phase);
      positions.push(r * Math.cos(t), r * Math.sin(t) * .77, .24 * Math.sin(2 * t + phase) + side * width * Math.sin(t + phase));
    }
    if (i < segments) { const a = i * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

export function createIntelligenceCore({ compact = false } = {}) {
  const root = new THREE.Group(), sculpture = new THREE.Group(), atmosphere = new THREE.Group(), foreground = new THREE.Group();
  root.add(atmosphere, sculpture, foreground);
  const gold = new THREE.MeshStandardMaterial({ color: '#c8b594', metalness: .83, roughness: .29, side: THREE.DoubleSide });
  const silver = new THREE.MeshStandardMaterial({ color: '#858e9a', metalness: .78, roughness: .32, side: THREE.DoubleSide });
  const contour = new THREE.LineBasicMaterial({ color: '#dcc6a2', transparent: true, opacity: .36 });
  const nucleusGeometry = new THREE.IcosahedronGeometry(.76, 1);
  const nucleus = new THREE.Mesh(nucleusGeometry, new THREE.MeshStandardMaterial({ color: '#303945', metalness: .68, roughness: .38, flatShading: true }));
  nucleus.scale.set(.87, 1.18, .91); nucleus.rotation.set(.18, .4, .12); sculpture.add(nucleus);
  const facets = new THREE.LineSegments(new THREE.EdgesGeometry(nucleusGeometry, 22), new THREE.LineBasicMaterial({ color: '#c8b594', transparent: true, opacity: .19 })); nucleus.add(facets);
  const ribbons = [];
  for (let i = 0; i < 3; i++) {
    const group = new THREE.Group(); group.rotation.set(.65 + i * .79, -.35 + i * .6, -.5 + i * .87);
    group.add(new THREE.Mesh(ribbonGeometry(i * 1.7, i === 0 ? .095 : .065, compact), i === 1 ? silver : gold));
    const vertices = group.children[0].geometry.attributes.position, edge = [];
    for (let j = 0; j < vertices.count; j += 2) edge.push(new THREE.Vector3().fromBufferAttribute(vertices, j));
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(edge), contour)); sculpture.add(group); ribbons.push(group);
  }
  const paths = [], pathMaterial = new THREE.LineBasicMaterial({ color: '#dcc6a2', transparent: true, opacity: .16 });
  for (let i = 0; i < (compact ? 4 : 7); i++) {
    const points = [];
    for (let j = 0; j < 100; j++) { const t = j / 100 * TAU, r = 1.65 + i * .034; points.push(new THREE.Vector3(r * Math.cos(t), .66 * Math.sin(t), .36 * Math.sin(t * 2 + i * .3))); }
    const curve = new THREE.CatmullRomCurve3(points, true);
    const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(curve.getPoints(160).slice(0, -1)), pathMaterial);
    line.rotation.set(.35 + i * .21, i * .38, -.55 + i * .28); sculpture.add(line); paths.push({ curve, line });
  }
  const pulseGeometry = new THREE.SphereGeometry(.018, 8, 6), pulseMaterial = new THREE.MeshBasicMaterial({ color: '#f1e8d8' });
  const pulses = paths.slice(0, compact ? 3 : 5).map(({ line, curve }, i) => { const pulse = new THREE.Mesh(pulseGeometry, pulseMaterial); line.add(pulse); return { pulse, curve, offset: i * .213 }; });
  // Sparse deterministic particles in two depth planes; none follow the cursor directly.
  for (const [layer, count, z] of [[atmosphere, compact ? 28 : 58, -1.5], [foreground, compact ? 8 : 15, 1.3]]) {
    const points = [];
    for (let i = 0; i < count; i++) { const a = i * 2.39996, r = 1.5 + (Math.sin(i * 12.7) + 1) * .58; points.push(Math.cos(a) * r, Math.sin(a) * r * .82, z + Math.sin(i * 3.1) * .3); }
    layer.add(new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(points, 3)), new THREE.PointsMaterial({ color: '#dcc6a2', size: layer === foreground ? .022 : .013, transparent: true, opacity: layer === foreground ? .48 : .24, depthWrite: false })));
  }
  return {
    root, sculpture, foreground, atmosphere,
    update(time, x, y, scale, reduced) {
      sculpture.rotation.set(y * .122 + (reduced ? 0 : Math.sin(time * .19) * .025), x * .175, -.08);
      sculpture.position.set(x * .035, (reduced ? 0 : Math.sin(time * .65) * .038) - y * .025, 0); sculpture.scale.setScalar(scale);
      foreground.position.set(x * .065, -y * .045, 0); atmosphere.position.set(-x * .025, y * .02, 0); atmosphere.rotation.z = reduced ? 0 : time * .007;
      ribbons.forEach((ribbon, i) => { ribbon.rotation.z = -.5 + i * .87 + (reduced ? 0 : Math.sin(time * .2 + i) * .045); });
      pulses.forEach(({ pulse, curve, offset }) => pulse.position.copy(curve.getPoint((time * .027 + offset) % 1)));
      contour.opacity = reduced ? .36 : .34 + Math.sin(time * .8) * .055;
    }
  };
}

export function disposeIntelligenceCore(root) {
  const geometries = new Set(), materials = new Set();
  root.traverse(object => { if (object.geometry) geometries.add(object.geometry); for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material) materials.add(material); });
  geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
}
