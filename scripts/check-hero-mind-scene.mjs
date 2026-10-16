import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createIntelligenceCore, disposeIntelligenceCore } from '../src/hero-mind/scene-geometry.js';

// CPU geometry and lifecycle checks; these do not claim browser or GPU validation.
const reports = [];
for (const compact of [false, true]) {
  const world = createIntelligenceCore({ compact });
  const geometries = new Set(), materials = new Set();
  world.root.traverse(object => {
    if (object.geometry) {
      geometries.add(object.geometry);
      assert.ok(object.geometry.attributes.position.array.every(Number.isFinite), 'all generated vertices are finite');
    }
    if (object.material) materials.add(object.material);
  });
  for (const [x, y] of [[-1,0],[1,0],[0,-1],[0,1],[0,0]]) {
    for (const scale of [.97,1,1.07]) {
      world.update(10,x,y,scale,false); world.root.updateMatrixWorld(true);
      assert.equal(Math.sign(world.sculpture.rotation.y),Math.sign(x),'yaw follows horizontal pointer');
      const bounds = new THREE.Box3().setFromObject(world.sculpture,true);
      assert.ok(Math.max(...bounds.min.toArray().map(Math.abs),...bounds.max.toArray().map(Math.abs))<2.1,'sculpture fits its reserved framing at maximum zoom');
      world.root.traverse(object=>assert.ok(object.matrixWorld.elements.every(Number.isFinite)));
      for(const aspect of [.7,.85,1.2,1.7]){
        const camera=new THREE.PerspectiveCamera(38,aspect,.1,30);
        camera.position.z=Math.max(7.5,2.45/(Math.tan(THREE.MathUtils.degToRad(19))*aspect));
        camera.updateMatrixWorld();
        world.sculpture.traverse(object=>{
          if(!object.geometry)return;
          const position=object.geometry.attributes.position;
          for(let i=0;i<position.count;i++){
            const point=new THREE.Vector3().fromBufferAttribute(position,i).applyMatrix4(object.matrixWorld).project(camera);
            assert.ok(Math.abs(point.x)<1&&Math.abs(point.y)<1,'maximum zoom silhouette stays in camera on narrow and wide screens');
          }
        });
      }
    }
  }
  world.update(0,0,0,1,true);
  const snapshot = () => { world.root.updateMatrixWorld(true); const matrices=[]; world.root.traverse(object=>matrices.push([...object.matrixWorld.elements])); return matrices; };
  const still=snapshot(); world.update(0,0,0,1,true); assert.deepEqual(snapshot(),still,'reduced-motion render stays static');
  world.update(0,0,0,1,false); const before=snapshot(); world.update(20,0,0,1,false); assert.notDeepEqual(snapshot(),before,'ambient sculpture and data flow evolve');
  const counts=new Map([...geometries,...materials].map(resource=>[resource,0]));
  counts.forEach((_,resource)=>resource.addEventListener('dispose',()=>counts.set(resource,counts.get(resource)+1)));
  disposeIntelligenceCore(world.root);
  assert.ok([...counts.values()].every(count=>count===1),'every shared GPU geometry and material disposed exactly once');
  reports.push({compact,vertices:[...geometries].reduce((sum,g)=>sum+g.attributes.position.count,0),geometries:geometries.size});
}
assert.ok(reports[1].vertices<reports[0].vertices,'compact scene reduces geometry and particles');
console.log('PASS: finite desktop/mobile geometry, directional yaw, maximum zoom bounds, static reduced-motion pose, ambient updates, and complete resource disposal.',reports);
