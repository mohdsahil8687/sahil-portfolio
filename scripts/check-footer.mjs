import assert from 'node:assert/strict';
import {createServer} from 'vite';
import React from 'react';
import {renderToString} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';

const vite=await createServer({server:{middlewareMode:true,hmr:false},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom'});
try{
  const {default:Footer,FooterEditor,focusInquiryForm,scrollToPageTop}=await vite.ssrLoadModule('/src/MegaFooter.jsx');
  const {defaultFooter,footerDestination,footerProfiles,resolveFooter}=await vite.ssrLoadModule('/src/footer-data.js');
  const render=settings=>renderToString(React.createElement(MemoryRouter,null,React.createElement(Footer,{settings}))).replace(/<!--.*?-->/g,'');
  const html=render({});
  assert.ok(html.includes('Let’s build something'));
  assert.ok(html.includes('<em>extraordinary.</em>'));
  assert.ok(html.includes('href="/contact#inquiry-form"'));
  for(const path of ['/','/work','/services','/#skills','/learning','/resources','/about','/reading','/community','/admin'])assert.ok(html.includes(`href="${path}"`),path);
  assert.equal((html.match(/href="\/reading"/g)||[]).length,1,'the original footer archive link is not duplicated by the header Reading entry');
  const savedLinks=[...defaultFooter.links].reverse().map(link=>({...link,visible:link.id!=='resources'}));
  assert.deepEqual(resolveFooter({links:savedLinks}).links,savedLinks,'existing footer order and visibility remain intact');
  assert.ok(html.includes('https://github.com/mohdsahil8687'));
  assert.ok(html.includes(`© ${new Date().getFullYear()}`));
  assert.ok(html.includes('WHAT I BUILD WITH'));
  assert.ok(html.includes('CURRENTLY EXPLORING'));
  assert.ok(html.includes('Back to Top'));
  assert.ok(!html.includes('mf-motion-ready'));
  assert.ok(!html.includes('Independent Studio'));
  const bad={links:[null],skills:[null],status:null,ctaDestination:'javascript:alert(1)'};
  const fallback=resolveFooter(bad);assert.equal(fallback.links.length,7);assert.deepEqual(fallback.skills,defaultFooter.skills);assert.equal(fallback.ctaDestination,'/contact#inquiry-form');
  assert.equal(footerDestination('/reading'),'/reading');assert.equal(footerDestination('/#reading-archive'),'/reading');
  for(const value of ['javascript:alert(1)','data:text/html,invalid','//evil.example','/missing','https://user:password@example.com'])assert.equal(footerDestination(value),'');
  const socials=render({footer:{socialsConfigured:true},instagram:'https://instagram.com/example',facebook:'https://facebook.com/example',linkedin:'https://linkedin.com/in/example',github:'https://github.com/beyonsahill'});
  assert.equal((socials.match(/target="_blank" rel="noopener noreferrer"/g)||[]).length,4);
  for(const label of ['Follow on Instagram','Connect on Facebook','Connect on LinkedIn','Explore my GitHub'])assert.ok(socials.includes(label));
  assert.equal(footerProfiles({footer:{socialsConfigured:true},github:''}).filter(p=>p.url).length,0);
  const hidden=render({footer:{socialsConfigured:true,showNavigation:false,showSocials:false,skills:[],status:{enabled:false}}});
  assert.ok(!hidden.includes('aria-label="Footer navigation"'));assert.ok(!hidden.includes('class="mf-social-dock"'));assert.ok(!hidden.includes('WHAT I BUILD WITH'));assert.ok(!hidden.includes('CURRENTLY EXPLORING'));
  const personalized=render({name:'Muhammad Sahil',availability:'Available for selected projects',footer:{signature:'PERSONAL SIGNATURE',monogram:'M/S',heading:'A considered next step',skills:['React'],links:defaultFooter.links.map(l=>({...l,visible:l.id==='work'})),status:{enabled:true,heading:'A FOCUS AREA',focus:'Owner supplied focus',description:'Owner supplied context',projectLink:'/work#projects'}}});
  for(const text of ['PERSONAL SIGNATURE','mf-monogram-wide','A considered next step','Owner supplied focus','Owner supplied context','Available for selected projects'])assert.ok(personalized.includes(text));
  assert.ok(personalized.includes('href="/work#projects"'));
  const calls=[];const doc={getElementById:id=>{assert.equal(id,'main-content');return {focus:options=>calls.push(['focus',options])};}};
  for(const reduced of [false,true]){calls.length=0;scrollToPageTop(doc,{matchMedia:()=>({matches:reduced}),scrollTo:options=>calls.push(['scroll',options])});assert.deepEqual(calls,[['scroll',{top:0,behavior:reduced?'auto':'smooth'}],['focus',{preventScroll:true}]]);}
  let focused=false;assert.equal(focusInquiryForm({querySelector:selector=>{assert.equal(selector,'input[name="name"]');return {focus:options=>{assert.deepEqual(options,{preventScroll:true});focused=true;}};}}),true);assert.ok(focused);assert.equal(focusInquiryForm(null),false);
  const editor=renderToString(React.createElement(FooterEditor,{settings:{},onSave:()=>{}})).replace(/<!--.*?-->/g,'');
  for(const label of ['Closing statement &amp; signature','Social connections','Footer navigation','Skills mini-preview','Professional focus','Save &amp; publish','Hidden publicly'])assert.ok(editor.includes(label),label);
  assert.ok(!editor.includes('<a '));
  console.log('PASS: footer rendering, every route, secure/missing socials, defaults and URL validation, visibility/customization, admin editor, and focus/scroll helper behavior including reduced motion. Browser interaction and live Supabase checks are separate.');
}finally{await vite.close();}
