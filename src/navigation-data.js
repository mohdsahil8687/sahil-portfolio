export const navigationLinks = [
  {id:'home',label:'Home',to:'/'},
  {id:'work',label:'Work',to:'/work'},
  {id:'expertise',label:'Expertise',to:'/services'},
  {id:'skills',label:'Skills',to:'/#skills'},
  {id:'reading',label:'Reading',to:'/reading'},
  {id:'resources',label:'Resources',to:'/resources'},
  {id:'about',label:'About',to:'/about'},
  {id:'journal',label:'Journal',to:'/learning'}
];
export const defaultNavigation = {
  brandTitle:'SAHIL.',brandSubtitle:'WEB / AI / DESIGN',ctaLabel:"Let’s Talk",ctaDestination:'/contact#inquiry-form',
  showSocials:true,showSkillsPreview:true,
  links:navigationLinks.map(l=>({id:l.id,visible:l.id!=='journal'})),
  workflow:{enabled:false,label:'CURRENTLY EXPLORING',title:'',description:''},
  skillGroups:[
    {title:'Frontend',icon:'code',technologies:['HTML','CSS','JavaScript','React','Vite']},
    {title:'Backend',icon:'server',technologies:['Node.js — Developing','Express.js — Developing','REST APIs — Developing']},
    {title:'Databases',icon:'database',technologies:['PostgreSQL','SQL','MongoDB — Exploring']},
    {title:'AI & development',icon:'brain',technologies:['Python','AI Fundamentals','Machine Learning — In Progress','AI Automation — Exploring']}
  ]
};
export function safeSocialUrl(value) {
  if(typeof value!=='string')return '';
  try{const u=new URL(value.trim());return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}
}
export function safeNavDestination(value) {
  if(typeof value!=='string')return '';
  if(['/contact','/contact#inquiry-form','/work','/work#projects','/#skills','/reading','/about','/resources','/learning','/'].includes(value))return value;
  const external=safeSocialUrl(value);
  return external.startsWith('https://')?external:'';
}
export function resolveNavigation(value) {
  const v=value&&typeof value==='object'?value:{};
  const text=(key,fallback)=>typeof v[key]==='string'&&v[key].trim()?v[key].trim():fallback;
  const groups=Array.isArray(v.skillGroups)&&v.skillGroups.length>0&&v.skillGroups.length<=6&&v.skillGroups.every(g=>g&&typeof g.title==='string'&&g.title.trim()&&['code','server','database','brain'].includes(g.icon)&&Array.isArray(g.technologies)&&g.technologies.every(t=>typeof t==='string'&&t.trim()));
  const validLinksFor=expected=>Array.isArray(v.links)&&v.links.length===expected.length&&new Set(v.links.map(l=>l?.id)).size===expected.length&&v.links.every(l=>l&&expected.some(n=>n.id===l.id)&&typeof l.visible==='boolean')&&v.links.some(l=>l.visible);
  let links=defaultNavigation.links;
  if(validLinksFor(navigationLinks))links=v.links;
  else if(validLinksFor(navigationLinks.filter(l=>l.id!=='reading'))){
    // Upgrade the previous seven-link configuration without resetting its order or visibility.
    const insertAt=v.links.findIndex(l=>l.id==='skills')+1;
    links=[...v.links.slice(0,insertAt),{id:'reading',visible:true},...v.links.slice(insertAt)];
  }
  const w=v.workflow&&typeof v.workflow==='object'?v.workflow:{};
  return {
    ...defaultNavigation,
    brandTitle:text('brandTitle',defaultNavigation.brandTitle),brandSubtitle:text('brandSubtitle',defaultNavigation.brandSubtitle),
    ctaLabel:text('ctaLabel',defaultNavigation.ctaLabel),ctaDestination:safeNavDestination(v.ctaDestination)||defaultNavigation.ctaDestination,
    showSocials:v.showSocials!==false,showSkillsPreview:v.showSkillsPreview!==false,
    links,skillGroups:groups?v.skillGroups:defaultNavigation.skillGroups,
    workflow:{enabled:w.enabled===true&&typeof w.title==='string'&&!!w.title.trim(),label:typeof w.label==='string'&&w.label.trim()?w.label:'CURRENTLY EXPLORING',title:typeof w.title==='string'?w.title:'',description:typeof w.description==='string'?w.description:''}
  };
}
export function navigationActive(pathname,skillsVisible=false) {
  if(pathname==='/')return skillsVisible?'skills':'home';
  return navigationLinks.find(l=>l.to!=='/'&&l.to!=='/#skills'&&(pathname===l.to||pathname.startsWith(l.to+'/')))?.id||null;
}
