import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { wordAt, wordPose } from '../src/text-interactions/word-motion.js';

// These simulate controller lifecycle and pointer events. Browser typography/GPU QA is separate.
for (const [text, offset, expected] of [['creative possibilities',3,'creative'],['creative possibilities',12,'possibilities'],['design × code',9,'code'],['مرحبا بالعالم',2,'مرحبا']]) {
  const word=wordAt(text,offset); assert.equal(text.slice(word.start,word.end),expected);
}
assert.equal(wordAt('  ×  ',2),null);
assert.equal(wordAt('   ',1),null);
const box={left:0,top:0,width:100,height:20};
assert.match(wordPose(box,{x:0,y:0},true),/translate3d\(-1.500px,-2.500px/);
assert.match(wordPose(box,{x:100,y:20},true),/translate3d\(1.500px,0.500px/);
assert.match(wordPose(box,{x:100,y:20},false,true),/scale\(1.025\)/);
assert.ok(!wordPose(box,{x:10000,y:-10000},true).includes('NaN'));

const vite=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false},appType:'custom'});
try {
  const {installTextHover}=await vite.ssrLoadModule('/src/text-interactions/TextHoverController.jsx');
  class Events {
    listeners=new Map();
    addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn);}
    removeEventListener(type,fn){this.listeners.get(type)?.delete(fn);}
    emit(type,event={}){for(const fn of this.listeners.get(type)||[])fn(event);}
    get count(){return [...this.listeners.values()].reduce((sum,set)=>sum+set.size,0);}
  }
  const animations=[];
  class ElementMock extends Events {
    style={};children=[];parentElement=null;tag='h2';blocked=false;
    classList={values:new Set(),add(...values){values.forEach(v=>this.values.add(v));},remove(...values){values.forEach(v=>this.values.delete(v));},toggle(v,on){on?this.values.add(v):this.values.delete(v);}};
    closest(selector){if(selector.startsWith('input,textarea'))return this.blocked?this:null;if(selector.startsWith('h1,h2,h3,h4,h5,h6')&&selector.length<25)return this.tag==='h2'?this:null;if(selector==='p')return this.tag==='p'?this:null;return this;}
    contains(element){return element===heading||element===input;}
    getAnimations(){return [];}
    appendChild(child){this.children.push(child);child.host=this;}
    remove(){this.host.children=this.host.children.filter(child=>child!==this);}
    animate(){const animation={playState:'running',cancel(){this.playState='idle';},finish(){this.playState='finished';this.onfinish?.();}};animations.push(animation);return animation;}
  }
  const scope=new ElementMock(),layer=new ElementMock(),heading=new ElementMock(),input=new ElementMock();
  heading.parentElement=scope; input.parentElement=scope;input.blocked=true;
  const node={nodeType:3,parentElement:heading,data:'Creative code flows with thoughtful motion'};
  let frame=0,selection='',observer;
  const callbacks=new Map(),media=new Events();media.matches=true;
  const documentMock=new Events();documentMock.hidden=false;
  documentMock.caretPositionFromPoint=x=>({offsetNode:node,offset:Math.round((x-100)/10)});
  documentMock.createElement=()=>new ElementMock();
  documentMock.createRange=()=>({setStart(n,start){this.node=n;this.start=start;},setEnd(n,end){this.end=end;},selectNodeContents(element){this.element=element;},getClientRects(){const left=100+this.start*10;return [{left,top:100,right:100+this.end*10,bottom:120,width:(this.end-this.start)*10,height:20}];},getBoundingClientRect(){return {left:Number.parseFloat(this.element.style.left),top:Number.parseFloat(this.element.style.top)};},toString(){return this.node.data.slice(this.start,this.end);}});
  const windowMock=new Events();windowMock.CSS={highlights:new Map()};windowMock.Highlight=class {constructor(...ranges){this.ranges=ranges;}};windowMock.getSelection=()=>({toString:()=>selection});
  const names=['window','document','Element','Node','CSS','Highlight','matchMedia','MutationObserver','getComputedStyle','requestAnimationFrame','cancelAnimationFrame'];
  const saved=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
  Object.assign(globalThis,{window:windowMock,document:documentMock,Element:ElementMock,Node:{TEXT_NODE:3},CSS:windowMock.CSS,Highlight:windowMock.Highlight,matchMedia:()=>media,MutationObserver:class{constructor(callback){this.callback=callback;observer=this;}observe(){}disconnect(){this.disconnected=true;}},getComputedStyle:element=>({fontFamily:'sans-serif',fontSize:'20px',lineHeight:'24px',color:'rgb(220,198,162)',transform:element.style.transform||'none',writingMode:'horizontal-tb',textShadow:'none'}),requestAnimationFrame:callback=>{callbacks.set(++frame,callback);return frame;},cancelAnimationFrame:id=>callbacks.delete(id)});
  ElementMock.prototype.animate=ElementMock.prototype.animate;
  const tick=()=>{const pending=[...callbacks.values()];callbacks.clear();pending.forEach(callback=>callback());};
  const move=(x,target=heading,type='mouse')=>scope.emit('pointermove',{clientX:x,clientY:110,target,pointerType:type,buttons:0});
  try {
    let dispose=installTextHover(scope,layer);
    move(125);move(130);assert.equal(callbacks.size,1,'fast pointer events coalesce');tick();
    assert.equal(layer.children.length,1);assert.equal(layer.children[0].textContent,'Creative');
    assert.equal(node.data,'Creative code flows with thoughtful motion','original text is untouched');
    move(205);tick();assert.equal(layer.children.length,2,'previous word has its own smooth return');
    move(125);tick();assert.equal(layer.children.length,2,'re-entering a returning word reuses its overlay');
    scope.emit('pointerleave');animations.forEach(animation=>{if(animation.playState==='running')animation.finish();});
    assert.equal(layer.children.length,0);assert.equal(CSS.highlights.size,0,'pointer-leave restores original text');
    move(125);tick();scope.emit('pointerdown');assert.equal(layer.children.length,0,'selection starts with original text');window.emit('pointerup');
    move(125,input);tick();assert.equal(layer.children.length,0,'input fields are excluded');
    move(125,heading,'touch');tick();assert.equal(layer.children.length,0,'touch does not animate text');
    selection='Creative';move(125);tick();assert.equal(layer.children.length,0,'text selection stays native');selection='';
    move(125);tick();window.emit('scroll');assert.equal(layer.children.length,0,'scroll cannot leave detached glyphs');
    move(125);tick();documentMock.emit('keydown');assert.equal(CSS.highlights.size,0,'keyboard use restores text');assert.ok(!scope.classList.values.has('pti-pointer'));
    move(125);tick();observer.callback();assert.equal(layer.children.length,0,'React text replacement clears the effect');
    move(125);tick();media.matches=false;media.emit('change');assert.equal(layer.children.length,0);assert.ok(!scope.classList.values.has('pti-enabled'),'reduced-motion/touch media disables the controller');
    dispose();assert.equal(scope.count+windowMock.count+documentMock.count+media.count,0,'all event listeners removed');assert.ok(observer.disconnected);assert.equal(callbacks.size,0);
    media.matches=true;delete windowMock.Highlight;dispose=installTextHover(scope,layer);move(125);tick();assert.equal(layer.children.length,0,'unsupported browsers leave original text visible');dispose();
  } finally {
    for(const [name,descriptor] of saved){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}
  }
  const css=await readFile(new URL('../src/text-interactions/text-interactions.css',import.meta.url),'utf8');
  assert.ok(!/cursor\s*:\s*none/.test(css),'native cursor is never hidden');assert.ok(css.includes('forced-colors:none'));assert.ok(css.includes('pointer-events:none!important'));
  console.log('PASS: multilingual word detection, bounded poses, frame coalescing, word enter/leave/re-entry, selection/input/touch exclusions, reduced-motion and unsupported-browser fallback, scroll/keyboard/mutation resets, listener/highlight/animation cleanup. Browser visual testing is still required.');
} finally {await vite.close();}
