import {navigationLinks,safeNavDestination,safeSocialUrl} from './navigation-data';

// Reading has its own existing footer link and visibility setting.
const footerNavigationLinks=navigationLinks.filter(link=>link.id!=='reading');

export const footerSocials=[
  {id:'instagram',label:'Instagram',tooltip:'Follow on Instagram'},
  {id:'facebook',label:'Facebook',tooltip:'Connect on Facebook'},
  {id:'linkedin',label:'LinkedIn',tooltip:'Connect on LinkedIn'},
  {id:'github',label:'GitHub',tooltip:'Explore my GitHub'}
];
export const defaultGithub='https://github.com/mohdsahil8687';
export const defaultFooter={
  eyebrow:'HAVE SOMETHING IN MIND?',heading:'Let’s build something',emphasis:'extraordinary.',
  supportingText:'From distinctive websites to intelligent workflows, let’s turn your ideas into useful digital experiences.',
  ctaLabel:'Start a conversation',ctaDestination:'/contact#inquiry-form',
  signature:'MUHAMMAD SAHIL',monogram:'S',showNavigation:true,showSocials:true,showAvailability:true,showReadingLink:true,
  links:footerNavigationLinks.map(l=>({id:l.id,visible:true})),
  skills:['React','JavaScript','Node.js','Express.js','Python','PostgreSQL','AI / ML','Automation'],
  status:{enabled:true,heading:'CURRENTLY EXPLORING',focus:'AI Automation & Full-Stack Development',description:'Exploring how thoughtful design, software engineering and intelligent workflows can work together.',projectLink:''},
  socialsConfigured:false
};
export function footerDestination(value){
  if(value==='/#reading-archive')return '/reading';
  if(['/reading','/community'].includes(value))return value;
  return safeNavDestination(value);
}
export function resolveFooter(value){
  const v=value&&typeof value==='object'?value:{};
  const text=(key,fallback)=>typeof v[key]==='string'&&v[key].trim()?v[key].trim():fallback;
  const s=v.status&&typeof v.status==='object'?v.status:{};
  const links=Array.isArray(v.links)&&v.links.length===footerNavigationLinks.length&&new Set(v.links.map(l=>l?.id)).size===footerNavigationLinks.length&&v.links.every(l=>l&&footerNavigationLinks.some(n=>n.id===l.id)&&typeof l.visible==='boolean');
  const skills=Array.isArray(v.skills)&&v.skills.length<=12&&v.skills.every(t=>typeof t==='string'&&t.trim()&&t.length<=60);
  return {...defaultFooter,
    ...Object.fromEntries(['eyebrow','heading','emphasis','supportingText','ctaLabel','signature','monogram'].map(k=>[k,text(k,defaultFooter[k])])),
    ctaDestination:footerDestination(v.ctaDestination)||defaultFooter.ctaDestination,
    ...Object.fromEntries(['showNavigation','showSocials','showAvailability','showReadingLink'].map(k=>[k,v[k]!==false])),
    links:links?v.links:defaultFooter.links,skills:skills?v.skills:defaultFooter.skills,socialsConfigured:v.socialsConfigured===true,
    status:{enabled:s.enabled!==false,heading:typeof s.heading==='string'&&s.heading.trim()?s.heading:defaultFooter.status.heading,focus:typeof s.focus==='string'&&s.focus.trim()?s.focus:defaultFooter.status.focus,description:typeof s.description==='string'?s.description:defaultFooter.status.description,projectLink:footerDestination(s.projectLink)||''}
  };
}
export function footerProfiles(settings={}){
  return footerSocials.map(meta=>{const raw=meta.id==='github'&&!settings.github&&!settings.footer?.socialsConfigured?defaultGithub:settings[meta.id];return {...meta,url:safeSocialUrl(raw)};});
}
