import assert from 'node:assert/strict';
import {createServer} from 'vite';
import React from 'react';
import {renderToString} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';

// Render the actual JSX through Vite without needing browser/backend credentials.
const vite=await createServer({server:{middlewareMode:true},appType:'custom'});
try {
  const {defaultSkills,validSkills,resolveSkills}=await vite.ssrLoadModule('/src/skills-data.js');
  const {default:Journey,SkillsEditor}=await vite.ssrLoadModule('/src/SkillsJourney.jsx');
  assert.equal(defaultSkills.length,9);
  assert.ok(validSkills(defaultSkills));
  for(const invalid of [null,[],{},[{id:'broken'}],[defaultSkills[0],defaultSkills[0]]]) {
    assert.equal(validSkills(invalid),false);
    assert.equal(resolveSkills(invalid),defaultSkills);
  }
  const render=skills=>renderToString(React.createElement(MemoryRouter,null,React.createElement(Journey,{skills})));
  const html=render(undefined);
  assert.equal((html.match(/class="sj-node"/g)||[]).length,9);
  assert.equal((html.match(/class="sj-mobile-details"/g)||[]).length,9);
  for(const s of defaultSkills)assert.ok(html.includes(s.title),s.title);
  assert.ok(html.includes('100+ WPM (future target)'));
  assert.ok(html.includes('to="/work#projects"')||html.includes('href="/work#projects"'));
  assert.ok(!html.includes('90 days.'));
  assert.ok(!html.includes('onMouseMove'));
  assert.equal(defaultSkills.find(s=>s.id==='deep-learning').status,'UP NEXT');
  assert.equal(defaultSkills.find(s=>s.id==='machine-learning').status,'IN PROGRESS');
  const reordered=[...defaultSkills].reverse();
  assert.ok(render(reordered).indexOf('Building intelligent experiences')<render(reordered).indexOf('The fundamentals'));
  const single=render([defaultSkills[0]]);
  assert.equal((single.match(/class="sj-node"/g)||[]).length,1);
  const editor=renderToString(React.createElement(SkillsEditor,{settings:{},onSave:()=>{}}));
  assert.ok(editor.includes('Save &amp; publish'));
  assert.ok(editor.includes('Add stage'));
  console.log('PASS: nine stages, mobile disclosures, honest statuses/target, project link, invalid-data fallback, reorder, single stage and admin editor rendering.');
} finally {await vite.close();}
