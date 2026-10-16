import assert from 'node:assert/strict';
import {createServer} from 'vite';
import React from 'react';
import {renderToString} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';

const vite=await createServer({server:{middlewareMode:true,hmr:false},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom'});
try {
  const {default:Navigation,NavigationEditor}=await vite.ssrLoadModule('/src/FloatingNavigation.jsx');
  const {defaultNavigation,resolveNavigation,navigationActive,safeSocialUrl,safeNavDestination}=await vite.ssrLoadModule('/src/navigation-data.js');
  const render=(settings={},path='/',projects=[])=>renderToString(React.createElement(MemoryRouter,{initialEntries:[path]},React.createElement(Navigation,{settings,projects})));
  const html=render();
  assert.equal((html.match(/class="fn-nav-label"/g)||[]).length,7);
  assert.ok(html.includes('href="/contact#inquiry-form"'));
  assert.ok(html.includes('href="/#skills"'));
  assert.ok(html.includes('href="/reading"'));
  assert.ok(html.includes('href="/learning"'));
  assert.ok(html.includes('aria-controls="fn-skills-panel"'));
  assert.ok(html.includes('id="fn-skills-panel" hidden=""'));
  assert.ok(!html.includes('class="fn-status-trigger"'));
  assert.ok(!html.includes('opens in new tab'));
  assert.ok(!html.includes('fn-mobile-open'));
  for(const bad of [null,{},[],{links:[null],skillGroups:[null]},{links:defaultNavigation.links.map(l=>({...l,visible:false}))},{links:defaultNavigation.links.map(l=>({...l,id:'home'}))}]) {
    const config=resolveNavigation(bad);
    assert.equal(config.links.filter(l=>l.visible).length,7);
    assert.equal(config.skillGroups.length,4);
  }
  for(const bad of ['javascript:alert(1)','data:text/html,bad','//example.com','https://user:password@example.com']) {
    assert.equal(safeSocialUrl(bad),'');assert.equal(safeNavDestination(bad),'');
  }
  assert.equal(safeNavDestination('/missing-page'),'');
  assert.equal(safeNavDestination('/contact#inquiry-form'),'/contact#inquiry-form');
  assert.equal(safeNavDestination('/reading'),'/reading');
  assert.equal(safeSocialUrl('https://github.com/mohdsahil8687'),'https://github.com/mohdsahil8687');
  const socials=render({instagram:'javascript:alert(1)',facebook:'https://facebook.com/example',linkedin:'https://linkedin.com/in/example',github:'https://github.com/mohdsahil8687'});
  assert.ok(!socials.includes('Instagram (opens in new tab)'));
  assert.equal((socials.match(/target="_blank" rel="noopener noreferrer"/g)||[]).length,3);
  const disabled=render({navigation:{showSocials:false},github:'https://github.com/mohdsahil8687'});
  assert.ok(!disabled.includes('GitHub (opens in new tab)'));
  const custom=render({navigation:{brandTitle:'CUSTOM',showSkillsPreview:false,links:[...defaultNavigation.links].reverse(),workflow:{enabled:true,title:'Confirmed current work',description:'Owner-provided description'}}});
  assert.ok(custom.includes('CUSTOM'));assert.ok(custom.includes('class="fn-status-trigger"'));
  assert.ok(custom.includes('Confirmed current work'));
  assert.match(custom,/<a(?=[^>]*href="\/#skills")(?=[^>]*class="fn-nav-label")[^>]*>/);
  assert.ok(custom.indexOf('data-nav="about"')<custom.indexOf('data-nav="home"'));
  assert.match(render({},'/resources/example'),/<a[^>]*aria-current="page"[^>]*>Resources/);
  for(const path of ['/reading','/reading/atomic-habits'])assert.match(render({},path),/<a(?=[^>]*href="\/reading")(?=[^>]*aria-current="page")[^>]*>Reading<\/a>/);
  assert.equal(navigationActive('/'), 'home');
  assert.equal(navigationActive('/',true), 'skills');
  assert.equal(navigationActive('/resources/free-pdf'), 'resources');
  assert.equal(navigationActive('/reading'), 'reading');
  assert.equal(navigationActive('/reading/atomic-habits'), 'reading');
  assert.equal(navigationActive('/contact'), null);
  const legacy=defaultNavigation.links.filter(l=>l.id!=='reading').reverse().map(l=>({...l,visible:['work','skills','journal'].includes(l.id)}));
  const upgraded=resolveNavigation({links:legacy}).links;
  assert.deepEqual(upgraded.filter(l=>l.id!=='reading'),legacy,'Legacy order and every visibility preference are preserved.');
  assert.deepEqual(upgraded[upgraded.findIndex(l=>l.id==='skills')+1],{id:'reading',visible:true});
  assert.ok(render({navigation:{links:legacy}}).includes('href="/reading"'));
  assert.deepEqual(resolveNavigation({links:legacy.map(l=>({...l,visible:false}))}).links,defaultNavigation.links);
  const readingHidden=defaultNavigation.links.map(l=>({...l,visible:l.id==='reading'?false:l.visible}));
  assert.equal(resolveNavigation({links:readingHidden}).links,readingHidden,'A complete eight-link configuration is retained unchanged.');
  assert.ok(!render({navigation:{links:readingHidden}}).includes('href="/reading"'));
  assert.equal(resolveNavigation({links:readingHidden,ctaDestination:'/reading'}).ctaDestination,'/reading');
  const projects=render({},'/',[{id:'hidden',title:'Hidden project',published:false},{id:'real',title:'Owner curated project',category:'WEB'}]);
  assert.ok(!projects.includes('Hidden project'));
  assert.ok(projects.includes('Owner curated project'));
  assert.ok(projects.includes('Preview selected projects'));
  assert.ok(!html.includes('Preview selected projects'));
  const editor=renderToString(React.createElement(NavigationEditor,{settings:{},onSave:()=>{}})).replace(/<!--.*?-->/g,'');
  for(const label of ['Navigation order &amp; visibility','Facebook URL','Current work preview','Skills preview','Save &amp; publish'])assert.ok(editor.includes(label),label);
  console.log('PASS: navigation rendering, Reading archive/detail route states, legacy order/visibility upgrade, saved Reading visibility, disclosure semantics, defaults, invalid URLs, secure social links, configured status, curated projects and admin editor.');
} finally {await vite.close();}
