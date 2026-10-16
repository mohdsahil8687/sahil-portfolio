import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { db, configured, googleEnabled, invoke } from './backend/client';
import {authService,initialCallbackError} from './backend/auth';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Check, CheckCircle2,
  ChevronDown, ChevronRight, Circle, Code2, Compass, Download, ExternalLink,
  FileDown, FileText, Github, Globe2, Instagram, Layers3, LayoutDashboard,
  Linkedin, LockKeyhole, LogIn, LogOut, Mail, Menu, Plus,
  Play, RotateCcw, Send, Settings2, ShieldCheck, Sparkles, Trash2, UploadCloud,
  Users, Workflow, X, Youtube, Zap, Eye, Pencil, BriefcaseBusiness
} from 'lucide-react';
import './styles.css';
import SkillsJourney, {SkillsEditor} from './SkillsJourney';
import FloatingNavigation, {NavigationEditor} from './FloatingNavigation';
import ReadingArchive, {BookNotes} from './ReadingArchive';
import BooksEditor from './BooksEditor';
import MegaFooter, {FooterEditor, focusInquiryForm} from './MegaFooter';
import {defaultBooks, publicBooks} from './books-data';
import HeroMindJourney from './hero-mind/HeroMindJourney';
import TextHoverController from './text-interactions/TextHoverController';
import AboutPortrait from './about/AboutPortrait';
import SoundSystem from './SoundSystem';
import LoadingScreen from './LoadingScreen';
import AuthPanel from './auth/AuthPanel';


const initialSettings = {
  name: 'Muhammad Sahil', displayName: 'Sahil', role: 'Freelance Web Developer & AI Automation Enthusiast',
  tagline: 'Thoughtful websites. Intelligent workflows. Real-world impact.',
  heroTitle: 'Designing what’s next.',
  intro: 'I build thoughtful websites and practical automations that solve real problems. Sharing what I learn as I build.',
  about: 'I’m Muhammad Sahil, a freelance developer interested in the intersection of web development, thoughtful design and AI automation. I focus on building useful digital experiences and documenting what I learn along the way.',
  location: 'Based in India · Available remotely', experience: '1', challengeDay: '0', challengeTotal: '90',
  availability: 'AVAILABLE FOR FREELANCE', email: '', instagram: '', youtube: '', github: '', linkedin: '', facebook: '',
  image1: '', image2: '', image3: '', image1Fit: 'cover', image2Fit: 'cover', image3Fit: 'cover',
  logo: '', calendarUrl: '', introVideoUrl: '', footerNote: 'Design · Development · AI'
};
const emptyItems = {services:[],projects:[],learning:[],resources:[],offers:[],books:defaultBooks};
const collections = ['services','projects','learning','resources','offers','books'];
const DataContext = createContext(null);
const safeExternal = value => /^https?:\/\//i.test(String(value || '').trim()) ? String(value).trim() : '';
const emailHref = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '') ? `mailto:${email}` : '';
const sortByPosition = (a,b) => (a.position ?? 99)-(b.position ?? 99);
const slugify = value => (value || 'resource').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,75) || 'resource';
const fmtDate = s => s ? new Date(s).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—';
const errText = err => err?.message || String(err || 'Something went wrong');
const csvCell = value => {
  const text=String(value??'');
  const safe=/^\s*[=+\-@]/.test(text)?`'${text}`:text;
  return `"${safe.replaceAll('"','""')}"`;
};

function DataProvider({children}) {
  const [settings,setSettings] = useState(initialSettings);
  const [items,setItems] = useState(emptyItems);
  const [session,setSession] = useState(null);
  const [authReady,setAuthReady] = useState(!configured);
  const [authError,setAuthError] = useState(initialCallbackError);
  const [loading,setLoading] = useState(configured);
  const [dataError,setDataError] = useState('');
  const refreshVersion=useRef(0),authUser=useRef(null),authToken=useRef(null);
  const refresh = useCallback(async () => {
    if (!db) return;
    const version=++refreshVersion.current;
    try{
    const results = await Promise.all([
      db.from('site_settings').select('data').eq('id',1).maybeSingle(),
      ...collections.map(name => db.from(name).select('*').order('position',{ascending:true}))
    ]);
    if(version!==refreshVersion.current)return;
    const errs=results.filter(r=>r.error).map(r=>r.error.message);
    if (errs.length) { setDataError(errs[0]); } else { setDataError(''); }
    if(results[0].data?.data) setSettings({...initialSettings,...results[0].data.data});
    collections.forEach((name,i)=>{if(results[i+1].data) setItems(old=>({...old,[name]:results[i+1].data}));});
    setLoading(false);
    }catch{if(version===refreshVersion.current){setDataError('Backend requests failed. Check Supabase configuration and connectivity.');setLoading(false);}}
  },[]);
  useEffect(()=>{
    if (!db) return;
    let active=true,revision=0;
    const accept=current=>{
      if(!active)return;
      const userId=current?.user?.id||null;
      if(authToken.current!==(current?.access_token||null)){authToken.current=current?.access_token||null;++refreshVersion.current;}
      if(authUser.current!==userId){
        authUser.current=userId;
        setItems(old=>Object.fromEntries(Object.entries(old).map(([name,rows])=>[name,rows.filter(row=>row.published===true)])));
      }
      setSession(current);setAuthReady(true);
    };
    const {data:{subscription}}=db.auth.onAuthStateChange((_event,current)=>{revision++;accept(current);});
    db.auth.getSession().then(({data,error})=>{if(!active||revision)return;if(error)setAuthError('Your previous session could not be restored. Please sign in again.');accept(data?.session||null);}).catch(()=>{if(active&&!revision){setAuthError('Session initialization failed. Please retry.');accept(null);}});
    return ()=>{active=false;++refreshVersion.current;subscription.unsubscribe();};
  },[]);
  useEffect(()=>{
    if(db&&authReady)refresh();
    return ()=>{++refreshVersion.current;};
  },[authReady,session?.access_token,refresh]);
  // Verified profile identities are created by the auth.users database trigger.
  const value=useMemo(()=>({settings,setSettings,items,setItems,session,authReady,authError,setAuthError,loading,dataError,refresh,db,configured}),[settings,items,session,authReady,authError,loading,dataError,refresh]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
const useData=()=>useContext(DataContext);
const published = (list) => (list||[]).filter(x=>x.published !== false).sort(sortByPosition);

function ScrollManager() {
  const loc = useLocation();
  const previousPath=useRef(loc.pathname);
  useEffect(()=>{
    const behavior=window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';
    if(loc.pathname!==previousPath.current)document.getElementById('main-content')?.focus({preventScroll:true});
    previousPath.current=loc.pathname;
    const scrollTimer=window.setTimeout(()=>{
      const hash=loc.hash||window.location.hash;
      if(!hash)return;
      const target=document.getElementById(hash.slice(1));
      if(target){window.scrollTo({top:target.getBoundingClientRect().top+window.scrollY-108,behavior});if(hash.slice(1)==='inquiry-form'&&loc.state?.focusInquiry)focusInquiryForm(target);}
    },100);
    if(!loc.hash)window.scrollTo({top:0,behavior:'auto'});
    if(db && !loc.pathname.startsWith('/admin')) {
      let visitorId=sessionStorage.getItem('sahil_visitor_session');
      if(!visitorId) { visitorId=crypto.randomUUID(); sessionStorage.setItem('sahil_visitor_session',visitorId); }
      db.from('page_views').insert({path:loc.pathname.slice(0,160),visitor_id:visitorId}).then(()=>{});
    }
    return ()=>window.clearTimeout(scrollTimer);
  },[loc.pathname,loc.hash]);
  return null;
}
function LinkOut({href,children,className='',...rest}) {
  const safe=safeExternal(href);
  return safe ? <a href={safe} className={className} target="_blank" rel="noopener noreferrer" {...rest}>{children}</a> : null;
}
const socialMeta = [ ['github',Github,'GitHub'], ['instagram',Instagram,'Instagram'], ['youtube',Youtube,'YouTube'], ['linkedin',Linkedin,'LinkedIn'] ];
function Brand({light=false}) {
  const {settings}=useData();
  return <Link to="/" aria-label="Muhammad Sahil — home" className={'brand '+(light?'brand-light':'')}>
    <span className="brand-icon">{settings.logo?<img src={settings.logo} alt="Sahil logo" />:<span>M<span className="brand-slash">/</span>S</span>}</span>
    <span className="brand-word">MUHAMMAD SAHIL<span className="brand-dot">.</span><small>DESIGN · DEVELOPMENT · AI</small></span>
  </Link>;
}
function Header() {const {settings,items}=useData();return <FloatingNavigation settings={settings} projects={items.projects}/>;}
function Footer(){const {settings}=useData();return <MegaFooter settings={settings}/>;}
function Shell({children}) { const scopeRef=useRef(null);return <div id="top" className="site-shell" ref={scopeRef}><TextHoverController scopeRef={scopeRef}/><Header/><main id="main-content" tabIndex="-1">{children}</main><Footer/></div>; }
function HashLink({to,...props}) {
  const hash=to.includes('#')?decodeURIComponent(to.slice(to.indexOf('#')+1)):'';
  return <Link to={to} {...props} onClick={event=>{
    props.onClick?.(event);
    if(event.defaultPrevented||!hash)return;
    window.setTimeout(()=>{
      const target=document.getElementById(hash);
      if(target){
        const behavior=window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';
        window.scrollTo({top:target.getBoundingClientRect().top+window.scrollY-108,behavior});
      }
    },100);
  }}/>;
}
function Eyebrow({children,number}) {return <div className="eyebrow"><span className="small-star">✳</span>{number&&<span className="muted-number">{number} /</span>}{children}</div>;}
function SectionTop({kicker,title,description,link,linkText='View all'}) {return <div className="section-heading"><div><Eyebrow>{kicker}</Eyebrow><h2>{title}</h2>{description&&<p>{description}</p>}</div>{link&&<Link to={link} className="text-link">{linkText}<ArrowUpRight size={17}/></Link>}</div>;}
function Cta({to,children,secondary=false}) { return <HashLink to={to} className={'btn '+(secondary?'btn-secondary':'btn-primary')}>{children}<ArrowUpRight size={17}/></HashLink>; }
function Progress({small=false}) { const {settings}=useData(); const day=Math.min(100,Math.max(0,Number(settings.challengeDay)||0)); const total=Math.max(1,Number(settings.challengeTotal)||90); return <div className={'progress-widget '+(small?'progress-small':'')}><div className="progress-top"><span>THE PUBLIC BUILD LOG</span><strong>DAY {String(day).padStart(2,'0')} <span>/ {total}</span></strong></div><div className="progress-track"><i style={{width:`${Math.min(100,day/total*100)}%`}} /></div><div className="progress-bottom"><span>Learn · Build · Share</span><Link to="/learning">Follow the journey <ArrowUpRight size={13}/></Link></div></div>; }
function HeroArtwork() {const {items}=useData();return <div className="hero-artwork hmj-artwork"><HeroMindJourney projects={items.projects}/></div>;}
const headlinePhrases = [
  ['Designing', 'what’s next.'], ['Building', 'digital experiences.'],
  ['Turning ideas', 'into reality.'], ['Exploring', 'creative possibilities.'],
  ['Learning AI', 'and building.'], ['Automating', 'intelligent workflows.'],
  ['Creating', 'smarter solutions.']
];
function AnimatedHeadline({initialPhrase}) {
  const [index,setIndex]=useState(0);
  useEffect(()=>{
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const timer=window.setInterval(()=>setIndex(current=>(current+1)%headlinePhrases.length),3200);
    return ()=>window.clearInterval(timer);
  },[]);
  const phrase=index===0&&initialPhrase&&initialPhrase!=='Designing what’s next.'
    ? [initialPhrase,'']
    : headlinePhrases[index];
  return <h1 className="hero-headline" aria-label="Freelance web developer creating digital experiences and smarter workflows">
    <span className="sr-only">Freelance web developer creating digital experiences and smarter workflows</span>
    <span className="headline-phrase" key={`${index}-${phrase[0]}`} aria-hidden="true">
      <span className="headline-line">{phrase[0].split(' ').map((word,i)=><span className="headline-word" style={{'--word-index':i}} key={word}>{word}</span>)}</span>
      {phrase[1]&&<span className="headline-line headline-emphasis">{phrase[1].split(' ').map((word,i)=><span className="headline-word" style={{'--word-index':i+2}} key={word}>{word}</span>)}</span>}
    </span>
  </h1>;
}
function Hero() {const {settings}=useData();return <section className="hero"><div className="hero-noise"/><div className="wide hero-grid">
  <div className="hero-copy"><div className="availability"><span className="pulse-dot"/>{settings.availability}</div>
    <div className="hero-index">MUHAMMAD SAHIL <span>—</span> WEB / AI</div>
    <AnimatedHeadline initialPhrase={settings.heroTitle}/>
    <p className="hero-role">{settings.role}</p>
    <p className="hero-lead">{settings.intro}</p>
    <div className="hero-actions"><HashLink to="/work#projects" className="btn btn-primary">Explore My Work <ArrowRight size={18}/></HashLink></div>
    <div className="hero-stats"><div><strong>{Number.parseFloat(settings.experience)||1}</strong><span>YEAR OF<br/>HANDS-ON EXPERIENCE</span></div></div>
  </div><HeroArtwork/></div><div className="wide hero-bottom" aria-hidden="true" style={{height:17,boxSizing:'content-box'}}/></section>}
function Marquee() {return <div className="marquee"><div className="marquee-inner">{Array.from({length:4},(_,i)=><span key={i}>WEB DEVELOPMENT <span>✳</span> AI AUTOMATION <span>✳</span> INTERFACE DESIGN <span>✳</span> BUILDING IN PUBLIC <span>✳</span></span>)}</div></div>}
function ProjectArtwork({item,index}) {return <div className={'project-art project-art-'+index}>{item.image_url?<img src={item.image_url} alt={item.title} loading="lazy"/>:<div className="mock-work"><div className="mock-browser"><i/><i/><i/><span>{item.title.replace(/\s+/g,'_').toLowerCase()}.app</span></div><div className="mock-content"><div className="mock-panel small-mock"><span>0{index+1} / PROJECT</span><b>{item.title.slice(0,18)}</b><span className="mock-line"/><span className="mock-line shorter"/></div><div className="mock-panel chart-mock"><span>FUNCTIONAL SYSTEMS</span><div className="mock-bars">{[40,75,50,92,67,86,56].map((h,i)=><i key={i} style={{height:`${h}%`}}/>)}</div></div></div></div>}<div className="project-art-label"><span>MS / SELECTED WORK</span><span>0{index+1}</span></div></div>}
function useReveal() {
  const ref=useRef(null);
  const [visible,setVisible]=useState(false);
  useEffect(()=>{
    const node=ref.current;
    if(!node)return;
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){setVisible(true);return;}
    if(!('IntersectionObserver' in window)){setVisible(true);return;}
    const observer=new IntersectionObserver(([entry])=>{
      if(entry.isIntersecting){setVisible(true);observer.disconnect();}
    },{threshold:0.12,rootMargin:'0px 0px -35px 0px'});
    observer.observe(node);
    return ()=>observer.disconnect();
  },[]);
  return [ref,visible];
}
function ProjectCard({item,index=0}) {
  const [ref,visible]=useReveal();
  return <article ref={ref} className={`project-card reveal ${visible?'is-visible':''}`}>
    <ProjectArtwork item={item} index={index%4}/>
    <div className="project-info"><div><div className="card-eyebrow">{item.category}</div><h3>{item.title}</h3><p>{item.description}</p><div className="tech-tags">{(item.tech||'').split('·').filter(Boolean).map(t=><span key={t}>{t.trim()}</span>)}</div></div>
      <div className="project-actions">{safeExternal(item.url)?<LinkOut href={item.url} className="round-arrow" aria-label={`Visit ${item.title}`}><ArrowUpRight size={21}/></LinkOut>:null}{safeExternal(item.repo_url)&&<LinkOut href={item.repo_url} className="project-github" aria-label={`View ${item.title} source on GitHub`}><Github size={19}/></LinkOut>}</div>
    </div><div className="project-status"><span className="tiny-dot"/>{item.status}</div>
  </article>;
}
function ServiceIcon({name,size=26}) {return name==='workflow'?<Workflow size={size}/>:name==='layers'?<Layers3 size={size}/>:name==='globe'?<Globe2 size={size}/>:<Code2 size={size}/>;}
function ServicesPreview() {const {items}=useData();return <section className="paper-section"><div className="wide"><SectionTop kicker="WHAT I DO" title={<>Building solutions,<br/><em>not just screens.</em></>} description="From first sketch to working product. A focused set of capabilities, built around the outcome." link="/services"/>
  <div className="service-grid">{published(items.services).slice(0,3).map((s,i)=><Link to="/services" key={s.id} className="service-card"><div className="service-top"><span>{s.category}</span><ArrowUpRight size={19}/></div><div className="service-icon"><ServiceIcon name={s.icon}/></div><h3>{s.title}</h3><p>{s.description}</p><div className="service-index">0{i+1}</div></Link>)}</div></div></section>}
function SkillsSection() {const {settings}=useData();return <SkillsJourney skills={settings.skillsJourney}/>;}
function ResourceCard({item}) {return <Link to={`/resources/${item.slug}`} className="resource-card"><div className="resource-card-top"><div className="resource-symbol"><FileText size={28}/></div><span>{item.file_url?'DOWNLOADABLE PDF':'COMING SOON'}</span></div><div className="card-eyebrow">{item.category}</div><h3>{item.title}</h3><p>{item.description}</p><div className="resource-card-bottom"><span>{item.file_url?'Open resource':'Preview details'}</span><ArrowUpRight size={20}/></div></Link>}
function ReadingPreview(){const {items}=useData();return <ReadingArchive books={items.books}/>;}
function ReadingPage(){return <Shell><ReadingPreview/></Shell>;}
function ReadingNotesPage(){const {items,loading}=useData();const {slug}=useParams();const books=publicBooks(items.books);return <Shell><BookNotes book={books.find(b=>b.slug===slug)} books={books} loading={loading}/></Shell>;}
function Home() {const {items}=useData();return <Shell><Hero/><Marquee/><ServicesPreview/><SkillsSection/>{published(items.offers).length>0&&<OffersBlock/>}</Shell>}
function PageTitle({kicker,title,description,aside}) {return <div className="page-title-wrap"><div className="wide page-title-grid"><div><Eyebrow>{kicker}</Eyebrow><h1>{title}</h1></div><div className="page-title-aside"><p>{description}</p>{aside}</div></div></div>}
function Work() {const {items}=useData();return <Shell><PageTitle kicker="01 / SELECTED WORK" title={<>Making ideas<br/><em>real.</em></>} description="An evolving collection of products, prototypes and experiments — with the process and details behind each build."/><section id="projects" className="dark-section page-content"><div className="wide"><div className="results-meta"><span>PROJECT ARCHIVE</span><span>{published(items.projects).length.toString().padStart(2,'0')} ITEMS</span></div><div className="work-grid">{published(items.projects).map((p,i)=><ProjectCard key={p.id} item={p} index={i}/>)}</div>{!published(items.projects).length&&<Empty label="Project case studies will appear here as they are ready to share."/>}</div></section></Shell>}
function Services() {const {items}=useData();return <Shell><PageTitle kicker="02 / EXPERTISE" title={<>Thoughtful design.<br/><em>Practical development.</em></>} description="Focused, flexible solutions for businesses who need a website, an interface, or a smarter way of working."/><section className="paper-section page-content"><div className="wide"><div className="service-grid">{published(items.services).map((s,i)=><article className="service-card" key={s.id}><div className="service-top"><span>{s.category}</span><span>0{i+1}</span></div><div className="service-icon"><ServiceIcon name={s.icon}/></div><h3>{s.title}</h3><p>{s.description}</p><HashLink className="text-link" to="/contact#inquiry-form">Discuss this service <ArrowUpRight size={16}/></HashLink></article>)}</div><div className="method-block"><Eyebrow>HOW I APPROACH WORK</Eyebrow><div className="method-steps">{[['01','Discover','Understand the actual problem and what success looks like.'],['02','Design','Map out clear journeys and a purposeful interface.'],['03','Develop','Build, test and integrate the working solution.'],['04','Refine','Iterate from feedback and prepare for launch.']].map(x=><div key={x[0]}><span>{x[0]}</span><h3>{x[1]}</h3><p>{x[2]}</p></div>)}</div></div></div></section><OffersBlock/></Shell>}
function Learning() {const {items}=useData();return <Shell><PageTitle kicker="03 / THE BUILD JOURNAL" title={<>Learning is<br/><em>a public practice.</em></>} description="A 90-day self-learning challenge, documenting the actual work behind AI, automation, design and development." aside={<Progress small/>}/><section className="paper-section page-content"><div className="wide"><div className="results-meta dark-meta"><span>JOURNAL ENTRIES</span><span>{published(items.learning).length.toString().padStart(2,'0')} NOTES</span></div><div className="journal-list">{published(items.learning).map((l,i)=><article className="journal-card" key={l.id}><div className="journal-num">{String(l.day_number??i+1).padStart(2,'0')}<span>/ 90</span></div><div><span className="card-eyebrow">{l.category}</span><h3>{l.title}</h3><p>{l.description}</p>{safeExternal(l.resource_url)&&<LinkOut className="text-link" href={l.resource_url}>View learning material <ArrowUpRight size={15}/></LinkOut>}</div><span className="journal-arrow"><ArrowUpRight size={21}/></span></article>)}</div></div></section></Shell>}
function ResourceDetail() {
  const {slug}=useParams();const {items,loading}=useData(); const [busy,setBusy]=useState(false); const [message,setMessage]=useState('');
  const item=(items.resources||[]).find(r=>r.slug===slug && r.published!==false);
  const download=async()=>{
    if(!item?.file_url)return;
    setBusy(true); setMessage('');
    try{
      if(db&&item.file_path){
        const {data,error}=await db.storage.from('portfolio-pdfs').download(item.file_path);
        if(error)throw error;
        const objectUrl=URL.createObjectURL(data);const a=document.createElement('a');a.href=objectUrl;a.download=`${item.slug}.pdf`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(objectUrl),3000);
      }else{const target=safeExternal(item.file_url);if(target)window.open(target,'_blank','noopener,noreferrer');else throw new Error('Invalid file URL');}
    }catch(err){setMessage('Could not download the file. Please try again.');}finally{setBusy(false);}
  };
  return <Shell><section className="resource-detail"><div className="wide"><Link to="/resources" className="text-link back-link"><ArrowLeft size={17}/> All resources</Link>{loading?<div className="empty-state">Loading resource…</div>:item?<div className="resource-detail-grid"><div><Eyebrow>{item.category}</Eyebrow><h1>{item.title}</h1><p>{item.description}</p><div className="resource-detail-actions">{item.file_url?<button onClick={download} disabled={busy} className="btn btn-primary"><Download size={18}/>{busy?'Preparing PDF…':'Download free PDF'}</button>:<span className="muted">The PDF is being prepared. Check back soon.</span>}</div>{message&&<p className="form-message error">{message}</p>}<p className="resource-disclaimer">Free to access. No email or account required.</p></div><div className="resource-detail-poster"><FileDown size={68}/><span>THE SAHIL RESOURCE LIBRARY</span><strong>BUILD<br/>BETTER<span>.</span></strong><small>DOCUMENT {item.slug.toUpperCase()}</small></div></div>:<div className="not-found"><h1>Resource not found.</h1><p>The document may have been removed or its link changed.</p><Cta to="/resources">Browse resources</Cta></div>}</div></section></Shell>
}
function Resources() {const {items}=useData();return <Shell><PageTitle kicker="04 / THE RESOURCE LIBRARY" title={<>Practical knowledge.<br/><em>Open access.</em></>} description="Real documents, useful templates and working notes — including how I pitch, plan and build."/><section className="paper-section page-content"><div className="wide"><div className="results-meta dark-meta"><span>FREE DOWNLOADS & GUIDES</span><span>{published(items.resources).length.toString().padStart(2,'0')} RESOURCES</span></div>{published(items.resources).length?<div className="resources-grid">{published(items.resources).map(r=><ResourceCard key={r.id} item={r}/>)}</div>:<div className="resources-empty"><div className="resource-symbol"><FileDown size={35}/></div><h3>Resource library, in progress.</h3><p>My practical PDFs, scripts and workflow templates will appear here as I publish them.</p><div className="resource-empty-art">[ UPLOAD · SHARE · LEARN ]</div></div>}</div></section></Shell>}
function About() {const {settings}=useData();return <Shell><PageTitle kicker="05 / BEHIND THE WORK" title={<>Curious by nature.<br/><em>Driven to build.</em></>} description="A little more about the person, the principles and the ambition behind the digital work."/><section className="paper-section about-main"><div className="wide about-grid"><div className="about-copy"><Eyebrow>MY STORY</Eyebrow><h2>I care about the<br/><em>details that count.</em></h2><p>{settings.about}</p><p>My focus today: development, thoughtful product experiences, and using AI where it genuinely improves a workflow.</p><div className="about-facts"><div><strong>{Number.parseFloat(settings.experience)||1}</strong><span>YEAR OF HANDS-ON EXPERIENCE</span></div></div><Cta to="/contact#inquiry-form">Send an inquiry</Cta></div><AboutPortrait src={settings.image2}/></div>
  <div className="wide about-second"><div>{settings.image3?<img src={settings.image3} alt="Behind the scenes of building projects" style={{objectFit:settings.image3Fit||'cover'}}/>:<div className="about-visual"><span>01 / RESEARCH</span><span>02 / DESIGN</span><span>03 / BUILD</span><span>04 / LEARN</span><strong>ALWAYS<br/>IN MOTION.</strong></div>}</div><div><Eyebrow>WHAT I BELIEVE</Eyebrow><h3>Less noise.<br/>More meaningful work.</h3><p>Great experiences aren't about using every trendy effect. They come from knowing what matters, making deliberate decisions and executing reliably.</p><div className="principles"><span><Check size={17}/> Design with intention</span><span><Check size={17}/> Communicate clearly</span><span><Check size={17}/> Ship and iterate</span></div></div></div></section></Shell>}
function OffersBlock() {const {items}=useData();const offers=published(items.offers);if(!offers.length)return null;return <section className="offers-block"><div className="wide"><SectionTop kicker="CURRENT OPPORTUNITIES" title={<>What's <em>available.</em></>} description="A small selection of current service offerings and collaboration opportunities."/><div className="offers-grid">{offers.map(o=><article className="offer-card" key={o.id}><Zap size={23}/><h3>{o.title}</h3><p>{o.description}</p>{safeExternal(o.action_url)?<LinkOut href={o.action_url} className="text-link">{o.action_label}<ArrowUpRight size={17}/></LinkOut>:<Link to="/contact" className="text-link">{o.action_label}<ArrowUpRight size={17}/></Link>}</article>)}</div></div></section>}
function videoSource(value) {
  try {
    const url=new URL(value);
    if(url.protocol!=='https:')return null;
    const host=url.hostname.toLowerCase().replace(/^www\./,'');
    if(host==='youtu.be') {
      const id=url.pathname.split('/').filter(Boolean)[0];
      return id?{type:'embed',src:`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`} : null;
    }
    if(host==='youtube.com' || host==='m.youtube.com') {
      const id=url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1];
      return id?{type:'embed',src:`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`} : null;
    }
    if(host==='vimeo.com') {
      const id=url.pathname.match(/^\/(\d+)/)?.[1];
      return id?{type:'embed',src:`https://player.vimeo.com/video/${id}`} : null;
    }
    if(/\.(mp4|webm)$/i.test(url.pathname))return {type:'file',src:url.href};
    return null;
  } catch {
    return null;
  }
}
function IntroVideo({url,poster}) {
  const [loaded,setLoaded]=useState(false);
  const source=videoSource(url||'');
  return <div className="intro-video">
    {source&&loaded
      ? source.type==='file'
        ? <video controls preload="none" poster={poster||undefined}><source src={source.src}/></video>
        : <iframe src={source.src} title="Muhammad Sahil introduction video" loading="lazy" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen/>
      : <button type="button" className="intro-video-poster" onClick={()=>source&&setLoaded(true)} disabled={!source} aria-label={source?'Load introduction video':'Introduction video not configured'}>
          {poster&&<img src={poster} alt="" loading="lazy"/>}
          <span className="intro-video-shade"/>
          <span className="intro-play"><Play size={20} fill="currentColor"/></span>
          <span className="intro-video-caption">{source?'A LITTLE ABOUT ME':'INTRODUCTION VIDEO · OPTIONAL'}</span>
        </button>}
  </div>;
}
function Contact() {
  const {settings}=useData();
  const [form,setForm]=useState({name:'',email:'',contact_number:'',project_type:'',message:'',website:''});
  const [status,setStatus]=useState('');
  const [busy,setBusy]=useState(false);
  const update=e=>setForm(x=>({...x,[e.target.name]:e.target.value}));
  const submit=async e=>{
    e.preventDefault();
    if(form.website)return;
    if(!db){setStatus('Inquiry submission needs Supabase configuration. Please use the contact link if available.');return;}
    setBusy(true);setStatus('');
    try {
       await invoke('portfolio-api',{
         action:'contact',
         name:form.name.trim(),email:form.email.trim(),contact_number:form.contact_number.trim(),
         project_type:form.project_type,message:form.message.trim(),website:form.website
       });
      setStatus('Thank you. Your inquiry has been received. I’ll get back to you soon.');
      setForm({name:'',email:'',contact_number:'',project_type:'',message:'',website:''});
    } catch(error) {
      setStatus(`Your inquiry could not be sent. ${errText(error)}`);
    } finally {
      setBusy(false);
    }
  };
  return <Shell><PageTitle kicker="06 / GET IN TOUCH" title={<>Let’s build<br/><em>something useful.</em></>} description="Tell me about the idea, the problem or the workflow. I’ll help you find a practical starting point."/>
    <section className="paper-section contact-section"><div className="wide contact-grid">
      <div className="contact-aside"><span className="card-eyebrow">OPEN FOR COLLABORATION</span><h2>Good projects start<br/>with a conversation.</h2><p>{settings.location}</p>
        {emailHref(settings.email)&&<a className="contact-mail" href={emailHref(settings.email)}>{settings.email}<ArrowUpRight size={17}/></a>}
        <div className="contact-socials">{socialMeta.map(([id,Icon,name])=><LinkOut key={id} href={settings[id]} className="social-icon" aria-label={name}><Icon size={20}/></LinkOut>)}</div>
        <IntroVideo url={settings.introVideoUrl} poster={settings.image2}/>
        <div className="contact-side-art"><span>YOUR IDEA</span><span>+</span><span>MY EXECUTION</span><span>=</span><strong>SOMETHING REAL.</strong></div>
      </div>
      <form id="inquiry-form" className="contact-form" onSubmit={submit}>
        <Eyebrow>PRIVATE CLIENT INQUIRY</Eyebrow>
        <div className="two-col">
          <label>Full name<input required minLength={2} maxLength={100} name="name" value={form.name} onChange={update} autoComplete="name" placeholder="Your name"/></label>
          <label>Email address<input required type="email" maxLength={254} name="email" value={form.email} onChange={update} autoComplete="email" placeholder="you@company.com"/></label>
        </div>
        <label>Contact number <span className="optional-label">Optional</span><input type="tel" maxLength={40} pattern="[+0-9(). -]{7,40}" title="Use 7–40 digits, spaces, or + ( ) . -" name="contact_number" value={form.contact_number} onChange={update} autoComplete="tel" placeholder="+91"/></label>
        <label>Project type <span className="optional-label">Optional</span><select name="project_type" value={form.project_type} onChange={update}><option value="">Choose a project type</option><option>Website Development</option><option>AI Workflow Automation</option><option>UI / UX Design</option><option>Full-Stack Development</option><option>Other</option></select></label>
        <label>Project description<textarea required minLength={10} maxLength={3000} rows={6} name="message" value={form.message} onChange={update} placeholder="What are you looking to build or improve?"/></label>
        <input className="honeypot" tabIndex={-1} autoComplete="off" name="website" value={form.website} onChange={update} aria-hidden="true"/>
        <button className="btn btn-primary send-button" type="submit" disabled={busy}>{busy?'Sending inquiry…':'Send Inquiry'}<Send size={18}/></button>
        <span className="form-smallprint">Your details are used only to respond to this inquiry. No account or marketing signup is required.</span>
        {status&&<p role="status" className={`form-message ${status.startsWith('Thank')?'success':'error'}`}>{status}</p>}
      </form>
    </div></section>
  </Shell>;
}
function Empty({label}){return <div className="empty-state"><Circle size={26}/>{label}</div>}
function NotFound(){return <Shell><section className="not-found full-height"><Eyebrow>404 / NOT FOUND</Eyebrow><h1>Wrong turn.<br/><em>Fresh start.</em></h1><Cta to="/">Return home</Cta></section></Shell>}

const fields = {
  services:[['title','Title'],['category','Eyebrow / Category'],['description','Description','textarea'],['icon','Icon','select:code|workflow|layers|globe'],['position','Sort position','number'],['published','Published','boolean']],
  projects:[['title','Project title'],['category','Category'],['description','Description','textarea'],['tech','Technology tags (separate with ·)'],['status','Status'],['url','Live project URL'],['repo_url','GitHub repository URL'],['image_url','Cover image URL','image'],['featured','Featured','boolean'],['position','Sort position','number'],['published','Published','boolean']],
  learning:[['title','Entry title'],['category','Category'],['description','Learning notes','textarea'],['day_number','Challenge day','number'],['resource_url','Video / reading URL'],['position','Sort position','number'],['published','Published','boolean']],
  resources:[['title','Document title'],['slug','Link slug (example: client-pitch-guide)'],['category','Category'],['description','Description','textarea'],['file_url','Public PDF URL','pdf'],['file_path','Supabase PDF path','hidden'],['position','Sort position','number'],['published','Published','boolean']],
  offers:[['title','Offer title'],['description','Description','textarea'],['action_label','Button label'],['action_url','Optional destination URL'],['position','Sort position','number'],['published','Published','boolean']]
};
const settingsFields = [
  ['name','Full name'],['displayName','Short name'],['role','Professional role'],['tagline','Tagline'],['heroTitle','Main headline'],['intro','Hero introduction','textarea'],['about','About paragraph','textarea'],
  ['availability','Availability badge'],['location','Location / remote note'],['experience','Experience display'],['challengeDay','90-day challenge: current day'],['challengeTotal','Challenge length'],
  ['email','Contact email'],['instagram','Instagram URL'],['youtube','YouTube URL'],['github','GitHub URL'],['linkedin','LinkedIn URL'],['facebook','Facebook URL'],['calendarUrl','Booking link'],['introVideoUrl','Introduction video URL (YouTube, Vimeo, MP4 or WebM)'],['footerNote','Footer line']
];
const starterItem = name => ({
  services:{title:'New service',category:'SPECIALTY',description:'',icon:'code',position:99,published:true},
  projects:{title:'New project',category:'WEB / PRODUCT',description:'',tech:'',status:'IN PROGRESS',url:'',repo_url:'',image_url:'',featured:false,position:99,published:true},
  learning:{title:'New learning entry',category:'BUILD JOURNAL',description:'',day_number:1,resource_url:'',position:99,published:true},
  resources:{title:'New resource',slug:'new-resource-'+Date.now().toString().slice(-6),category:'FREE GUIDE',description:'',file_url:'',file_path:'',position:99,published:true},
  offers:{title:'New offer',description:'',action_label:'Let’s talk',action_url:'',position:99,published:true}
}[name]);
async function sanitizeSvgUpload(file) {
  const source=await file.text();
  const document=new DOMParser().parseFromString(source,'image/svg+xml');
  if(document.querySelector('parsererror')||document.documentElement.localName!=='svg')throw new Error('This SVG file could not be safely validated.');
  document.doctype?.remove();
  document.querySelectorAll('script,foreignObject,iframe,object,embed,audio,video,animate,animateTransform,animateMotion,set').forEach(node=>node.remove());
  document.querySelectorAll('*').forEach(node=>{
    [...node.attributes].forEach(attribute=>{
      const name=attribute.name.toLowerCase();
      const value=attribute.value.trim();
      if(name.startsWith('on')||name==='style'||(/^(href|xlink:href)$/i.test(name)&&!value.startsWith('#'))||/url\s*\(/i.test(value))node.removeAttribute(attribute.name);
    });
  });
  return new File([new XMLSerializer().serializeToString(document.documentElement)],file.name,{type:'image/svg+xml'});
}
async function mediaUpload(file,bucket){
  if(!db)throw new Error('Supabase not configured.');
  if(file.size>10*1024*1024)throw new Error('File is larger than 10MB. Compress it before uploading.');
  const allowed=bucket==='portfolio-pdfs'?['application/pdf']:['image/png','image/jpeg','image/webp','image/avif','image/svg+xml'];
  if(!allowed.includes(file.type))throw new Error('Unsupported file type. Use '+(bucket==='portfolio-pdfs'?'PDF.':'JPG, PNG, WebP, AVIF or SVG.'));
  const safeFile=file.type==='image/svg+xml'?await sanitizeSvgUpload(file):file;
  const ext=(safeFile.name.split('.').pop()||'file').toLowerCase().replace(/[^a-z0-9]/g,'');
  const path=`uploads/${crypto.randomUUID()}.${ext}`;
  const {error}=await db.storage.from(bucket).upload(path,safeFile,{contentType:safeFile.type,upsert:false,cacheControl:'3600'});
  if(error)throw error;
  const {data}=db.storage.from(bucket).getPublicUrl(path);
  return {url:data.publicUrl,path};
}
async function removeMediaUrl(fullyQualified,bucket){
  if(!db || !fullyQualified)return;
  const marker=`/storage/v1/object/public/${bucket}/`;
  const idx=fullyQualified.indexOf(marker);
  if(idx===-1)return;
  const path=decodeURIComponent(fullyQualified.substring(idx+marker.length).split('?')[0]);
  if(!path.startsWith('uploads/'))return;
  await db.storage.from(bucket).remove([path]);
}
function SignInButton({children='Continue with Google',after='/admin'}){
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const go=async()=>{setBusy(true);setError('');try{await authService.signIn(after);}catch(error){setError(error.message);}finally{setBusy(false);}};
  if(!googleEnabled)return <p className="form-message" role="status">Google sign-in is disabled until Google is enabled in Supabase and <code>VITE_GOOGLE_AUTH_ENABLED=true</code> is set in <code>.env.local</code>.</p>;
  return <><button className="btn btn-primary" disabled={!db||busy} onClick={go} type="button"><LogIn size={18}/>{busy?'Redirecting…':children}</button>{error&&<p className="form-message error" role="alert">{error}</p>}</>;
}
const exitSession=()=>authService.signOut().catch(error=>window.alert(error.message));
function AdminMfa({onVerified}){
  const [code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const verify=async event=>{
    event.preventDefault();setBusy(true);setError('');
    try{await authService.verifyMfa(code);setCode('');onVerified();}
    catch(error){setError(error.message);}finally{setBusy(false);}
  };
  return <div className="admin-gate"><div className="gate-card"><ShieldCheck size={32}/><h1>Verify your authenticator.</h1><p>Use the authenticator already enrolled on your admin account. Google login does not bypass this check.</p><form onSubmit={verify}><label className="editor-label"><span>Six-digit authenticator code</span><input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event=>setCode(event.target.value)}/></label><button className="btn btn-primary" disabled={busy}>{busy?'Verifying…':'Verify'}</button></form>{error&&<p className="form-message error" role="alert">{error}</p>}<button className="back-to-home" onClick={exitSession}>Sign out</button></div></div>;
}
function Admin() {
  const {session,authReady,authError,refresh,configured,dataError}=useData();const [permission,setPermission]=useState({token:null,status:'checking'});const [checkCycle,setCheckCycle]=useState(0);const [tab,setTab]=useState('overview');
  useEffect(()=>{
    if(!db||!session)return;
    let active=true;const token=session.access_token;
    setPermission({token,status:'checking'});
    authService.adminAccess().then(result=>{if(active)setPermission({...result,token});}).catch(()=>{if(active)setPermission({token,status:'setup',message:'Admin authorization could not be verified. Retry after checking the connection and database setup.'});});
    return ()=>{active=false;};
  },[session?.access_token,checkCycle]);
  const access=permission.token===session?.access_token?permission:{status:'checking'};
   if(!configured)return <div className="admin-gate"><Brand/><div className="gate-card"><Settings2 size={31}/><h1>Connect your portfolio backend.</h1><p>The website preview works now. To activate uploads, email/password login, analytics and the dashboard, set up Supabase and add the environment variables in <code>.env</code>.</p><Link to="/" className="text-link"><ArrowLeft size={17}/> View website</Link></div></div>;
  if(!authReady)return <div className="admin-gate"><div className="gate-card"><span className="spin-dot"/> Restoring your session…</div></div>;
   if(!session)return <div className="admin-gate"><Brand/><div className="gate-card"><div className="card-eyebrow">PRIVATE ADMIN ACCESS</div><h1>Welcome back,<br/>Muhammad.</h1><p>Sign in with your approved Supabase email and password. Administrator access is verified by the database.</p><AuthPanel admin/>{authError&&<p className="form-message error" role="alert">{authError}</p>}<Link to="/" className="back-to-home"><ArrowLeft size={15}/> Back to portfolio</Link></div></div>;
  if(access.status==='checking')return <div className="admin-gate"><div className="gate-card"><span className="spin-dot"/> Verifying administrator access…</div></div>;
  if(access.status==='mfa')return <AdminMfa onVerified={()=>setCheckCycle(value=>value+1)}/>;
  if(access.status!=='allowed')return <div className="admin-gate"><Brand/><div className="gate-card"><ShieldCheck size={32}/><h1>{access.status==='setup'?'Admin setup is incomplete.':'Signed in, not an admin.'}</h1><p>{access.message} Only an existing trusted project owner can grant administrator membership in Supabase SQL Editor.</p><button className="btn btn-primary" onClick={exitSession}>Sign out</button><Link to="/" className="back-to-home">Return to site</Link></div></div>;
  const tabs=[['overview','Overview',LayoutDashboard],['settings','Site content',Settings2],['navigation','Navigation',Menu],['footer','Footer',Layers3],['skills','Skills journey',Compass],['books','Reading archive',FileText],['media','Photos & logo',UploadCloud],['services','Services',Layers3],['projects','Projects',Code2],['learning','Learning log',Compass],['resources','PDF resources',FileDown],['offers','Offers',Zap],['messages','Inquiries',Mail],['audience','Audience',Users]];
  return <div className="admin-layout"><aside className="admin-sidebar"><Brand light/><div className="admin-sidebar-sub">PRIVATE ADMIN DASHBOARD</div><nav>{tabs.map(([id,label,Icon])=><button key={id} className={tab===id?'selected':''} onClick={()=>setTab(id)}><Icon size={17}/>{label}</button>)}</nav><div className="admin-sidebar-bottom"><Link to="/"><ExternalLink size={17}/> View live site</Link><button onClick={exitSession}><LogOut size={17}/> Sign out</button></div></aside><div className="admin-main"><header className="admin-topbar"><div><span className="green-dot"/> PORTFOLIO ADMINISTRATION</div><div className="admin-account"><span>{session.user.email}</span><button onClick={refresh} title="Refresh content"><RotateCcw size={17}/></button></div></header><div className="admin-mobile-nav"><select aria-label="Choose dashboard section" value={tab} onChange={e=>setTab(e.target.value)}>{tabs.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select><Link to="/">View site ↗</Link></div><main className="admin-content">{dataError&&<p className="admin-warning">Supabase request failed: {dataError}. Verify that you ran setup.sql and configured the public key.</p>}
    {tab==='overview'?<AdminOverview onNavigate={setTab}/>:tab==='settings'?<SettingsEditor/>:tab==='navigation'?<NavigationAdmin/>:tab==='footer'?<FooterAdmin/>:tab==='skills'?<SkillsAdmin/>:tab==='books'?<BooksAdmin/>:tab==='media'?<MediaEditor/>:collections.includes(tab)?<CollectionEditor key={tab} name={tab}/>:tab==='messages'?<AdminMessages/>:tab==='audience'?<AdminAudience/>:null}</main></div></div>;
}
function BooksAdmin(){const {refresh}=useData();return <BooksEditor db={db} onRefresh={refresh} onUpload={file=>mediaUpload(file,'portfolio-media')}/>;}
function FooterAdmin(){
  const {settings,setSettings}=useData();
  const save=async patch=>{
    const next={...settings,...patch};
    const {data,error}=await db.from('site_settings').update({data:next,updated_at:new Date().toISOString()}).eq('id',1).select('id');
    if(error)throw error;
    if(!data?.length)throw new Error('No settings updated. Check your administrator permissions and site_settings row.');
    setSettings(next);
  };
  return <FooterEditor settings={settings} onSave={save}/>;
}
function NavigationAdmin(){
  const {settings,setSettings}=useData();
  const save=async patch=>{
    const next={...settings,...patch};
    const {data,error}=await db.from('site_settings').update({data:next,updated_at:new Date().toISOString()}).eq('id',1).select('id');
    if(error)throw error;
    if(!data?.length)throw new Error('No settings updated. Check your administrator permissions and site_settings row.');
    setSettings(next);
  };
  return <NavigationEditor settings={settings} onSave={save}/>;
}
function SkillsAdmin(){
  const {settings,setSettings}=useData();
  const save=async skills=>{
    const next={...settings,skillsJourney:skills};
    const {data,error}=await db.from('site_settings').update({data:next,updated_at:new Date().toISOString()}).eq('id',1).select('id');
    if(error)throw error;
    if(!data?.length)throw new Error('No settings updated. Check your administrator permissions and site_settings row.');
    setSettings(next);
  };
  return <SkillsEditor settings={settings} onSave={save}/>;
}
function AdminHeader({eyebrow,title,description,action}){return <div className="admin-heading"><div><div className="card-eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>}
function AdminOverview({onNavigate}) {
  const {items,settings}=useData();const [numbers,setNumbers]=useState({});
  useEffect(()=>{if(!db)return;Promise.all(['page_views','contact_messages','member_profiles'].map(name=>db.from(name).select('*',{count:'exact',head:true}))).then(result=>setNumbers({views:result[0].count??'—',inquiries:result[1].count??'—',members:result[2].count??'—'}));},[]);
  const cards=[['Page views (not unique)',numbers.views??'…',Eye],['Member registrations',numbers.members??'…',Users],['Client inquiries',numbers.inquiries??'…',Mail],['PDF resources',items.resources.length,FileDown]];
  return <><AdminHeader eyebrow="OVERVIEW" title="Your portfolio, at a glance." description="Manage your public content and private client inquiries."/><div className="metric-grid">{cards.map(([label,value,Icon])=><div className="metric-card" key={label}><Icon size={22}/><strong>{value}</strong><span>{label}</span></div>)}</div><div className="admin-panel"><div className="admin-panel-head"><h2>Quick actions</h2><span>MANAGE & PUBLISH</span></div><div className="quick-actions">{[['media','Update portrait or logo',UploadCloud],['projects','Add a new project',Code2],['resources','Publish a free PDF',FileDown],['services','Edit your services',BriefcaseBusiness],['settings','Update 90-day challenge',Settings2],['messages','Review client inquiries',Mail]].map(([id,label,Icon])=><button key={id} onClick={()=>onNavigate(id)}><Icon size={20}/>{label}<ArrowUpRight size={17}/></button>)}</div></div><div className="admin-info-row"><div className="admin-panel"><h3>Learning journey</h3><p>Update this separately from professional experience.</p><h2 className="admin-challenge">Day {settings.challengeDay} <span>/ {settings.challengeTotal}</span></h2></div><div className="admin-panel"><h3>Data and privacy</h3><p>Visitors can download public PDFs without signing in. Inquiry records are restricted to the administrator.</p></div></div></>;
}
function EditorField({label,type='text',value,onChange,disabled=false}){
  if(type==='hidden')return null;
  return <label className="editor-label"><span>{label}</span>{type==='textarea'?<textarea rows={4} value={value??''} onChange={e=>onChange(e.target.value)} disabled={disabled}/>:type==='boolean'?<div className="boolean-field"><input type="checkbox" checked={value===true} onChange={e=>onChange(e.target.checked)} disabled={disabled}/><span>{value?'Visible / enabled':'Hidden / disabled'}</span></div>:type.startsWith('select:')?<select value={value||''} onChange={e=>onChange(e.target.value)}>{type.slice(7).split('|').map(opt=><option key={opt}>{opt}</option>)}</select>:<input type={type==='number'?'number':'text'} value={value??''} onChange={e=>onChange(type==='number'?Number(e.target.value):e.target.value)} disabled={disabled}/>}</label>;
}
function SettingsEditor(){const {settings,setSettings}=useData();const [draft,setDraft]=useState(settings);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  useEffect(()=>setDraft(settings),[settings]);
  const save=async e=>{e.preventDefault();setBusy(true);setMessage('');try{if(draft.introVideoUrl&&!videoSource(draft.introVideoUrl))throw new Error('Use a valid HTTPS YouTube, Vimeo, MP4, or WebM URL.');const {error}=await db.from('site_settings').update({data:draft,updated_at:new Date().toISOString()}).eq('id',1);if(error)throw error;setSettings(draft);setMessage('Changes published successfully.');}catch(error){setMessage(errText(error));}finally{setBusy(false);}};
  return <><AdminHeader eyebrow="GLOBAL EDITOR" title="Website content" description="Edit your headline, about text, challenge progress and social links. Changes appear on the public site."/><form className="admin-panel admin-form" onSubmit={save}><div className="form-fields-grid">{settingsFields.map(([k,label,type])=><EditorField key={k} label={label} type={type} value={draft[k]} onChange={v=>setDraft(x=>({...x,[k]:v}))}/>)}</div><button className="btn btn-primary" disabled={busy} type="submit"><Check size={17}/>{busy?'Publishing…':'Save & publish'}</button>{message&&<p className={'form-message '+(message.startsWith('Changes')?'success':'error')}>{message}</p>}</form></>;
}
function MediaEditor() {const {settings,setSettings}=useData();const [busy,setBusy]=useState('');const [notice,setNotice]=useState('');
  const media=[['logo','Brand logo','SVG, PNG or WebP — compact, transparent artwork is best',null],['image1','Hero artwork','Your main portrait / personal image','image1Fit'],['image2','About portrait','Your second image, featured on the About page','image2Fit'],['image3','Behind-the-scenes image','A desk, working environment or personal project photo','image3Fit']];
  const persist=async (slot,urlValue)=>{const data={...settings,[slot]:urlValue};const {error}=await db.from('site_settings').update({data,updated_at:new Date().toISOString()}).eq('id',1);if(error)throw error;setSettings(data);};
  const add=async (slot,file)=>{if(!file)return;setBusy(slot);setNotice('');try{const newFile=await mediaUpload(file,'portfolio-media');const old=settings[slot];try{await persist(slot,newFile.url);}catch(err){await removeMediaUrl(newFile.url,'portfolio-media');throw err;}if(old&&old!==newFile.url)await removeMediaUrl(old,'portfolio-media');setNotice('Image updated successfully.');}catch(err){setNotice(errText(err));}setBusy('');};
  const remove=async slot=>{if(!window.confirm('Remove this image from your website?'))return;setBusy(slot);setNotice('');try{const old=settings[slot];await persist(slot,'');await removeMediaUrl(old,'portfolio-media');setNotice('Image removed.');}catch(err){setNotice(errText(err));}setBusy('');};
  const setFit=async(key,value)=>{setBusy(key);setNotice('');try{const data={...settings,[key]:value};const {error}=await db.from('site_settings').update({data,updated_at:new Date().toISOString()}).eq('id',1);if(error)throw error;setSettings(data);}catch(error){setNotice(errText(error));}finally{setBusy('');}};
  return <><AdminHeader eyebrow="MEDIA LIBRARY" title="Your visual identity" description="Upload, replace or remove each image individually. Images are limited to 10 MB; SVG uploads are sanitized before storage."/><div className="media-grid">{media.map(([slot,title,caption,fitKey])=><article className="admin-panel media-item" key={slot}><div className="media-preview">{settings[slot]?<img src={settings[slot]} alt={title} style={{objectFit:slot==='logo'?'contain':settings[fitKey]||'cover'}}/>:<div><UploadCloud size={36}/><span>NO IMAGE UPLOADED</span></div>}</div><h3>{title}</h3><p>{caption}</p>{fitKey&&<label className="editor-label image-fit-label"><span>Image display</span><select value={settings[fitKey]||'cover'} disabled={!!busy} onChange={e=>setFit(fitKey,e.target.value)}><option value="cover">Cover · crop to fill</option><option value="contain">Contain · show whole image</option></select></label>}<div className="media-actions"><label className="admin-file-btn"><UploadCloud size={16}/>{busy===slot?'Uploading…':'Upload / replace'}<input aria-label={'Upload '+title} type="file" disabled={!!busy} accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml" onChange={e=>{add(slot,e.target.files[0]);e.target.value='';}}/></label>{settings[slot]&&<button className="danger-outline" disabled={!!busy} onClick={()=>remove(slot)}><Trash2 size={16}/> Remove</button>}</div></article>)}</div>{notice&&<p role="status" className="form-message">{notice}</p>}</>;
}
function CollectionEditor({name}){
  const {items,refresh}=useData();const [editing,setEditing]=useState(null);const [draft,setDraft]=useState(null);const [busy,setBusy]=useState(false);const [notice,setNotice]=useState('');
  const rows=(items[name]||[]).slice().sort(sortByPosition);
  const open=item=>{setDraft(item?{...item}:starterItem(name));setEditing(item?.id || 'new');setNotice('');};
  const cancel=()=>{setEditing(null);setDraft(null);};
  const save=async e=>{e.preventDefault();setBusy(true);setNotice('');try{
    const allowedColumns=fields[name].map(f=>f[0]).filter(f=>f!=='file_path');
    const payload=Object.fromEntries(allowedColumns.map(k=>[k,draft[k]]));
    if(name==='resources'){payload.file_path=draft.file_path || '';payload.slug=slugify(payload.slug||payload.title);}
    if(name==='resources'&&(!payload.slug||!/^[-a-z0-9]+$/.test(payload.slug)))throw new Error('Enter a valid resource slug.');
    if(name==='projects'){for(const field of ['url','repo_url','image_url'])if(payload[field]&&!safeExternal(payload[field]))throw new Error(`${field} must begin with https://`);}
    if(editing==='new'){const {error}=await db.from(name).insert(payload);if(error)throw error;}
    else{const {error}=await db.from(name).update(payload).eq('id',editing);if(error)throw error;}
    await refresh();cancel();setNotice('Content published successfully.');
  }catch(err){setNotice(errText(err));}setBusy(false);};
  const deleteItem=async item=>{if(!window.confirm(`Delete “${item.title}”? This cannot be undone.`))return;setBusy(true);const {error}=await db.from(name).delete().eq('id',item.id);if(error)setNotice(errText(error));else { if(name==='resources'&&item.file_url)await removeMediaUrl(item.file_url,'portfolio-pdfs');await refresh();setNotice('Item deleted.'); }setBusy(false);};
  const upload=async (event,field)=>{const f=event.target.files?.[0];event.target.value='';if(!f)return;setBusy(true);setNotice('');try{const bucket=field==='file_url'?'portfolio-pdfs':'portfolio-media';const file=await mediaUpload(f,bucket);setDraft(old=>({...old,[field]:file.url,...(field==='file_url'?{file_path:file.path}:{})}));setNotice('File uploaded. Press Save & publish to finish.');}catch(err){setNotice(errText(err));}setBusy(false);};
  const titles={services:'Services',projects:'Selected projects',learning:'Learning journal',resources:'PDF resource library',offers:'Offers & opportunities'};
  return <><AdminHeader eyebrow="COLLECTION EDITOR" title={titles[name]} description={`Create, edit, hide, reorder or remove your ${name}.`} action={<button className="btn btn-primary" onClick={()=>open()}><Plus size={17}/> Add new</button>}/>
  {editing&&<form onSubmit={save} className="admin-panel admin-form"><div className="admin-panel-head"><h2>{editing==='new'?'Create new':'Edit'} {name.slice(0,-1)}</h2><button className="plain-icon-btn" type="button" onClick={cancel} aria-label="Close editor"><X size={20}/></button></div><div className="form-fields-grid">{fields[name].map(([field,label,type])=><div key={field} className={type==='textarea'?'full-field':''}><EditorField label={label} type={type==='image'||type==='pdf'?'text':type} value={draft?.[field]} onChange={v=>setDraft(old=>({...old,[field]:v}))}/>{(type==='image'||type==='pdf')&&<label className="admin-file-btn file-inline"><UploadCloud size={16}/> Upload {type==='pdf'?'PDF':'image'}<input type="file" disabled={busy} accept={type==='pdf'?'application/pdf':'image/jpeg,image/png,image/webp,image/avif,image/svg+xml'} onChange={e=>upload(e,field)}/></label>}</div>)}</div><div className="form-actions"><button className="btn btn-primary" disabled={busy} type="submit"><Check size={17}/>{busy?'Saving…':'Save & publish'}</button><button className="btn btn-secondary" type="button" onClick={cancel}>Cancel</button></div></form>}
  {notice&&<p role="status" className="form-message">{notice}</p>}<div className="admin-panel data-list"><div className="admin-panel-head"><h2>Published & draft entries</h2><span>{rows.length} TOTAL</span></div>{rows.length?rows.map(item=><div className="data-row" key={item.id}><div className="data-row-icon">{name==='resources'?<FileText size={20}/>:name==='projects'?<Code2 size={20}/>:<Layers3 size={20}/>}</div><div className="data-row-main"><strong>{item.title}</strong><small>{item.category || item.status || (item.published?'PUBLISHED':'DRAFT')} · {item.published?'LIVE':'HIDDEN'}</small></div><div className="data-row-actions"><button title="Edit" disabled={busy} onClick={()=>open(item)}><Pencil size={17}/></button><button title="Delete" disabled={busy} onClick={()=>deleteItem(item)}><Trash2 size={17}/></button></div></div>):<Empty label="No items yet. Use Add new to create your first entry."/>}</div></>;
}
function AdminMessages(){
  const [messages,setMessages]=useState([]);
  const [busy,setBusy]=useState(true);
  const [error,setError]=useState('');
  const [filter,setFilter]=useState('all');
  const load=async()=>{
    setBusy(true);
    const {data,error}=await db.from('contact_messages').select('*').order('created_at',{ascending:false}).limit(500);
    setMessages(data||[]);
    setError(error?errText(error):'');
    setBusy(false);
  };
  useEffect(()=>{load();},[]);
  const updateStatus=async(id,status)=>{
    setBusy(true);setError('');
    const {error}=await db.from('contact_messages').update({status}).eq('id',id);
    if(error){setError(errText(error));setBusy(false);return;}
    await load();
  };
  const remove=async id=>{
    if(!window.confirm('Permanently delete this inquiry?'))return;
    setBusy(true);setError('');
    const {error}=await db.from('contact_messages').delete().eq('id',id);
    if(error){setError(errText(error));setBusy(false);return;}
    await load();
  };
  const visible=filter==='all'?messages:messages.filter(message=>message.status===filter);
  const exportCsv=()=>{
    const columns=['id','name','email','contact_number','project_type','message','status','created_at'];
    const csv=[columns,...visible.map(message=>columns.map(column=>message[column]??''))]
      .map(row=>row.map(csvCell).join(',')).join('\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download='client-inquiries.csv';link.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  return <><AdminHeader eyebrow="PRIVATE INBOX" title="Client inquiries" description="Review, update, and respond to messages submitted through the public contact form."/>
    {error&&<p role="alert" className="form-message error">{error}</p>}
    <div className="admin-panel">
      <div className="inquiry-toolbar"><label className="editor-label"><span>Filter inquiries</span><select value={filter} onChange={event=>setFilter(event.target.value)}><option value="all">All statuses</option><option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option></select></label><button className="admin-file-btn" onClick={exportCsv} disabled={!visible.length}><Download size={15}/> Export filtered CSV</button></div>
      {busy?<p>Loading inquiries…</p>:visible.length?visible.map(message=><article className="message-card" key={message.id}>
        <div className="message-head"><strong>{message.name}</strong><span>{fmtDate(message.created_at)}</span></div>
        <div className="inquiry-meta"><span>{message.project_type||'Project type not specified'}</span><span>Inquiry #{message.id.slice(0,8)}</span></div>
        <p>{message.message}</p>
        <div className="message-actions"><div className="inquiry-contact-links">
          <a href={`mailto:${encodeURIComponent(message.email)}?subject=${encodeURIComponent('Re: Your website inquiry')}`} className="text-link"><Mail size={16}/>{message.email}</a>
          {message.contact_number&&<a href={`tel:${encodeURIComponent(message.contact_number)}`} className="text-link">{message.contact_number}</a>}
        </div>
          <label className="status-select-label"><span>Status</span><select value={message.status||'new'} disabled={busy} onChange={event=>updateStatus(message.id,event.target.value)}><option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option></select></label>
          <button onClick={()=>remove(message.id)} disabled={busy}><Trash2 size={16}/> Delete</button>
        </div>
      </article>):<Empty label="No inquiries match this filter."/>}
    </div>
  </>;
}
function AdminAudience() {const [members,setMembers]=useState([]);const [error,setError]=useState('');const [busy,setBusy]=useState(true);const [onlyOpted,setOnlyOpted]=useState(false);
  useEffect(()=>{db.from('member_profiles').select('*').order('created_at',{ascending:false}).limit(1000).then(({data,error})=>{setMembers(data||[]);setError(error?errText(error):'');setBusy(false);});},[]);
  const optins=members.filter(m=>m.marketing_opt_in);
  const visible=onlyOpted?optins:members;
  const exportCsv=()=>{const csv=[['email','name','opted_in','created_at'],...visible.map(m=>[m.email,m.full_name,m.marketing_opt_in?'YES':'NO',m.created_at])].map(row=>row.map(csvCell).join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='sahil-audience.csv';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);};
  return <><AdminHeader eyebrow="MEMBER ANALYTICS" title="Your audience" description="Private list of users who voluntarily signed in with Google. Marketing permission is recorded separately."/><div className="metric-grid mini-metrics"><div className="metric-card"><Users size={20}/><strong>{members.length}</strong><span>Google logins</span></div><div className="metric-card"><CheckCircle2 size={20}/><strong>{optins.length}</strong><span>Marketing opt-ins</span></div></div><div className="admin-panel"><div className="admin-panel-head"><h2>Registered members</h2><div className="audience-tools"><label><input type="checkbox" checked={onlyOpted} onChange={e=>setOnlyOpted(e.target.checked)}/> Marketing opt-ins only</label><button className="admin-file-btn" onClick={exportCsv} disabled={!visible.length}><Download size={15}/> Export CSV</button></div></div><p className="privacy-note">Only send bulk promotional emails to members who have explicitly opted in. Google sign-in does not authorize advertising emails.</p>{error&&<p className="form-message error">{error}</p>}{busy?<p>Loading members…</p>:visible.map(m=><div className="data-row" key={m.user_id}><div className="data-row-icon"><Users size={18}/></div><div className="data-row-main"><strong>{m.full_name || 'Community member'}</strong><small>{m.email}</small></div><span className={m.marketing_opt_in?'consent-yes':'consent-no'}>{m.marketing_opt_in?'OPTED IN':'NO CONSENT'}</span></div>)}{!busy&&!visible.length&&<Empty label="No matching sign-ins yet."/>}</div></>;
}
function MemberPage(){const {session}=useData();const [optin,setOptin]=useState(false);const [busy,setBusy]=useState(false);const [saved,setSaved]=useState('');
  useEffect(()=>{if(session?.user&&db)db.from('member_profiles').select('marketing_opt_in').eq('user_id',session.user.id).maybeSingle().then(({data})=>{setOptin(!!data?.marketing_opt_in);});},[session?.user?.id]);
  const save=async()=>{setBusy(true);const {error}=await db.from('member_profiles').update({marketing_opt_in:optin,updated_at:new Date().toISOString()}).eq('user_id',session.user.id);setSaved(error?errText(error):'Your communication preference has been saved.');setBusy(false);};
  return <Shell><section className="member-area"><div className="wide"><div className="member-card"><Eyebrow>THE SAHIL LEARNING COMMUNITY</Eyebrow><h1>Your journey,<br/><em>your choice.</em></h1>{!db?<p>Sign-in is available after the portfolio backend is connected.</p>:!session?<><p>Sign in with Google to join the community. Downloading resources does not require an account.</p><SignInButton after="/community"/></>:<><p>Signed in as <strong>{session.user.email}</strong>. You can manage your preferences below.</p><label className="optin-box"><input type="checkbox" checked={optin} onChange={e=>setOptin(e.target.checked)}/><span>I explicitly agree to receive occasional emails about new learning resources, services and updates. I can withdraw this consent at any time.</span></label><button className="btn btn-primary" disabled={busy} onClick={save}>{busy?'Saving…':'Save preference'}<Check size={16}/></button><button className="signout-link" onClick={exitSession}>Sign out</button>{saved&&<p className="form-message">{saved}</p>}</>}</div></div></section></Shell>;
}
function SiteApp(){const location=useLocation();const {loading}=useData();return <><ScrollManager/>{loading&&<div className="first-load-indicator" aria-hidden="true"/>}<Routes><Route path="/" element={<Home/>}/><Route path="/work" element={<Work/>}/><Route path="/services" element={<Services/>}/><Route path="/learning" element={<Learning/>}/><Route path="/reading" element={<ReadingPage/>}/><Route path="/reading/:slug" element={<ReadingNotesPage/>}/><Route path="/resources" element={<Resources/>}/><Route path="/resources/:slug" element={<ResourceDetail/>}/><Route path="/about" element={<About/>}/><Route path="/contact" element={<Contact/>}/><Route path="/admin" element={<Admin/>}/><Route path="/community" element={<MemberPage/>}/><Route path="*" element={<NotFound/>}/></Routes>{!location.pathname.startsWith('/admin')&&<FloatingCommunityLink/>}</>}
function FloatingCommunityLink(){const {session}=useData();return <Link to="/community" className="community-floating"><span className="community-icon"><Sparkles size={16}/></span><span>{session?'My community settings':'Join the learning journey'}</span><ArrowUpRight size={15}/></Link>}

createRoot(document.getElementById('root')).render(<React.StrictMode><LoadingScreen/><DataProvider><BrowserRouter><SoundSystem/><SiteApp/></BrowserRouter></DataProvider></React.StrictMode>);
