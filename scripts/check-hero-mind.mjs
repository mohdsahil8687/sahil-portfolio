import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createServer} from 'vite';
import React from 'react';
import {renderToString} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';

const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');
const sha=value=>createHash('sha256').update(value).digest('hex');
const main=(await read('src/main.jsx')).replace(/\r\n/g,'\n');
const home=main.match(/function Home\(\)[\s\S]*?(?=\nfunction PageTitle)/)?.[0];
assert.ok(home,'homepage source is present');
assert.ok(!home.includes('<ReadingPreview'),'the authorized homepage reading archive removal remains in place');
assert.equal((home.match(/<SkillsSection\/>/g)||[]).length,1,'existing homepage Skills placement remains');
// Reverse only the authorized removal before comparing the rest of main.jsx
// with the exact workspace baseline. This still rejects every other tail change.
const mainBeforeReadingRemoval=main.replace(home,home.replace('<SkillsSection/>','<SkillsSection/><ReadingPreview/>'));
const preserved=[
  ['left hero and grid markup',/function Hero\(\)[\s\S]*?(?=\nfunction Marquee)/,'cfe1bfc7b626f50e37b8195d735af83718c99283415c6c334e88e7de9a923214'],
  ['headline phrases and animation',/const headlinePhrases =[\s\S]*?(?=\nfunction Hero\(\))/,'5b855c6d8f0cb91abb126f6625e1752e73f8ef13efd31868b5c171459bd8af8e'],
  ['settings, data provider, navigation and preceding components',/const url =[\s\S]*?(?=\nfunction HeroArtwork)/,'141ce045b188335d95e1f575e7af2169a6f77de6c6ff301228cc950fff848b27'],
  ['all components and routes after the hero',/function Marquee[\s\S]*/,'e969c7084997a905f00509f781044f8fe7abf9a070c99389aa958ed24276e132']
];
for(const [label,pattern,expected] of preserved){
  const match=mainBeforeReadingRemoval.match(pattern);
  assert.ok(match,`${label}: source region present`);
  assert.equal(sha(match[0]),expected,`${label}: unchanged from pre-implementation workspace`);
}
assert.equal(
  sha(await readFile(new URL('src/styles.css',root))),
  '6509e953533701087778608f1445af146889d7e5fbab82fbcda0cefe6b89763a',
  'the entire pre-existing stylesheet is byte-for-byte unchanged'
);

if(process.argv.includes('--preservation-only')){
  console.log('PASS: exact pre-implementation left hero, headline, settings/providers, surrounding components/routes and base stylesheet preservation, with only the authorized homepage reading archive removal.');
}else{
  await checkJourney();
}
async function checkJourney(){
  const vite=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true},appType:'custom',plugins:[{
    name:'verify-home-render',enforce:'pre',
    transform(source,id){
      if(!id.replaceAll('\\','/').split('?')[0].endsWith('/src/main.jsx'))return null;
      const entry=/^createRoot\(document\.getElementById\('root'\)\)\.render\([^\r\n]*\);$/m;
      assert.ok(entry.test(source));
      return {code:source.replace(entry,'export {Home,DataProvider};'),map:null};
    }
  }]});
  try{
    const {default:Visual}=await vite.ssrLoadModule('/src/hero-mind/HeroMindJourney.jsx');
    const html=renderToString(React.createElement(Visual));
    assert.match(html,/role="img"/);
    assert.match(html,/<svg[\s>]/,'static fallback exists before JavaScript or WebGL');
    assert.match(html,/champagne ribbons/,'artwork has an accessible description');
    assert.doesNotMatch(html,/<button|<a\s|tabindex|INSIDE MY MIND|Always Learning|Drag to explore|LEARNING|hmj-cursor/);
    const {Home,DataProvider}=await vite.ssrLoadModule('/src/main.jsx');
    const homepage=renderToString(React.createElement(MemoryRouter,null,React.createElement(DataProvider,null,React.createElement(Home))));
    for(const present of ['class="hero"','class="hero-copy"','hic-visual','floating-navigation','id="skills"','class="mega-footer'])assert.ok(homepage.includes(present),`homepage renders ${present}`);
    console.log('PASS: accessible artwork SSR, static SVG fallback, no carousel, controls, slogans, or custom cursor. Application preservation checks also passed.');
  }finally{await vite.close();}
}
