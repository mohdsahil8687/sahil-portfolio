import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import {
  ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Check, CheckCircle2,
  ChevronDown, ChevronRight, Circle, Code2, Compass, Download, ExternalLink,
  FileDown, FileText, Github, Globe2, Instagram, Layers3, LayoutDashboard,
  Linkedin, LockKeyhole, LogIn, LogOut, Mail, Menu, MousePointer2, Plus,
  RotateCcw, Send, Settings2, ShieldCheck, Sparkles, Trash2, UploadCloud,
  Users, Workflow, X, Youtube, Zap, Eye, Pencil, BriefcaseBusiness
} from 'lucide-react';
import './styles.css';

const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
const configured = url.startsWith('https://') && !!key && !url.includes('YOUR-PROJECT');
const db = configured ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;

const initialSettings = {
  name: 'Muhammad Sahil', displayName: 'Sahil', role: 'Independent Developer & AI Automation Builder',
  tagline: 'Thoughtful websites. Intelligent workflows. Real-world impact.',
  heroTitle: 'Designing what’s next.',
  intro: 'I build distinctive web experiences and practical automations that solve real problems. Documenting the process, one project at a time.',
  about: 'I’m Muhammad Sahil, an independent developer working at the intersection of web development, design and AI automation. I believe useful technology should look exceptional, feel effortless and make measurable sense. This space is a public record of what I build, test and learn.',
  location: 'Based in India · Available remotely', experience: '01+', challengeDay: '09', challengeTotal: '90',
  availability: 'AVAILABLE FOR FREELANCE', email: '', instagram: '', youtube: '', github: '', linkedin: '',
  image1: '', image2: '', image3: '', logo: '', calendarUrl: '', footerNote: 'Design. Build. Improve. Repeat.'
};
const demo = {
  services: [
    { id:'ds1', title:'Website Development', category:'01 / DIGITAL EXPERIENCES', description:'Responsive, high-performing business sites, landing pages and full-stack experiences built with clarity and purpose.', icon:'code', position:1, published:true },
    { id:'ds2', title:'AI Workflow Automation', category:'02 / INTELLIGENT SYSTEMS', description:'Connecting repetitive tasks, tools and data into practical automated workflows to free up human time.', icon:'workflow', position:2, published:true },
    { id:'ds3', title:'UI / UX & Prototyping', category:'03 / PRODUCT DESIGN', description:'Thoughtful interface design, clickable prototypes and seamless user journeys built around real needs.', icon:'layers', position:3, published:true }
  ],
  projects: [
    {id:'dp1', title:'DWS Billing Suite', category:'FULL-STACK / OPERATIONS', description:'A water-delivery management platform with admin, worker and customer flows, dispatch tracking and billing.', tech:'React · Node.js · PostgreSQL', status:'BUILT / IMPROVING', featured:true, position:1, published:true},
    {id:'dp2', title:'ReviewFlow AI', category:'PRODUCT / CUSTOMER EXPERIENCE', description:'QR-led business feedback flow with business-specific templates, owner tools and an evolving analytics dashboard.', tech:'React · Express · PostgreSQL', status:'IN DEVELOPMENT', featured:true, position:2, published:true},
    {id:'dp3', title:'SAHIL AI', category:'AI AGENT / DESKTOP', description:'A local desktop assistant experiment combining voice interaction, a Python backend and system tool workflows.', tech:'Python · FastAPI · React', status:'EXPERIMENTAL', featured:false, position:3, published:true},
    {id:'dp4', title:'Weather Intelligence', category:'PYTHON / DATA', description:'A compact weather interface that turns live weather data into a readable, actionable dashboard.', tech:'Python · NiceGUI · API', status:'BUILT', featured:false, position:4, published:true}
  ],
  learning: [
    {id:'dl1', title:'Learn in public. Build in public.', category:'THE 90-DAY SERIES', description:'Sharing the real process behind improving technical skills: experiments, things that worked and what I would change.', day_number:1, position:1, published:true},
    {id:'dl2', title:'Solving actual business problems with AI', category:'AUTOMATION NOTES', description:'How to approach a repetitive workflow, identify bottlenecks and build a useful prototype before promising results.', day_number:5, position:2, published:true},
    {id:'dl3', title:'From an idea to a deployable product', category:'BUILD JOURNAL', description:'Breaking a product into scope, UI, data, authentication and a realistic deployment checklist.', day_number:8, position:3, published:true}
  ],
  resources: [], offers: []
};
const collections = ['services','projects','learning','resources','offers'];
const DataContext = createContext(null);
const safeExternal = value => /^https?:\/\//i.test(String(value || '').trim()) ? String(value).trim() : '';
const emailHref = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '') ? `mailto:${email}` : '';
const sortByPosition = (a,b) => (a.position ?? 99)-(b.position ?? 99);
const slugify = value => (value || 'resource').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,75) || 'resource';
const fmtDate = s => s ? new Date(s).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—';
const errText = err => err?.message || String(err || 'Something went wrong');

function DataProvider({children}) {
  const [settings,setSettings] = useState(initialSettings);
  const [items,setItems] = useState(demo);
  const [session,setSession] = useState(null);
  const [loading,setLoading] = useState(configured);
  const [dataError,setDataError] = useState('');
  const refresh = async () => {
    if (!db) return;
    const results = await Promise.all([
      db.from('site_settings').select('data').eq('id',1).maybeSingle(),
      ...collections.map(name => db.from(name).select('*').order('position',{ascending:true}))
    ]);
    const errs=results.filter(r=>r.error).map(r=>r.error.message);
    if (errs.length) { setDataError(errs[0]); } else { setDataError(''); }
    if(results[0].data?.data) setSettings({...initialSettings,...results[0].data.data});
    collections.forEach((name,i)=>{if(results[i+1].data) setItems(old=>({...old,[name]:results[i+1].data}));});
    setLoading(false);
  };
  useEffect(()=>{
    if (!db) return;
    refresh();
    db.auth.getSession().then(({data})=>setSession(data?.session || null));
    const {data:{subscription}}=db.auth.onAuthStateChange((_event,current)=>setSession(current));
    return ()=>subscription.unsubscribe();
  },[]);
  useEffect(()=>{
    const user = session?.user;
    if (!db || !user?.email) return;
    db.from('member_profiles').upsert({user_id:user.id,email:user.email,full_name:user.user_metadata?.full_name || user.user_metadata?.name || ''}, {onConflict:'user_id',ignoreDuplicates:true}).then(()=>{});
  },[session?.user?.id]);
  const value=useMemo(()=>({settings,setSettings,items,setItems,session,loading,dataError,refresh,db,configured}),[settings,items,session,loading,dataError]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
const useData=()=>useContext(DataContext);
const published = (list) => (list||[]).filter(x=>x.published !== false).sort(sortByPosition);

function ScrollManager() {
  const loc = useLocation();
  useEffect(()=>{
    if(loc.hash) { setTimeout(()=>document.getElementById(loc.hash.slice(1))?.scrollIntoView({behavior:'smooth'}),100); }
    else window.scrollTo({top:0,behavior:'auto'});
    if(!db || loc.pathname.startsWith('/admin')) return;
    let visitorId=sessionStorage.getItem('sahil_visitor_session');
    if(!visitorId) { visitorId=crypto.randomUUID(); sessionStorage.setItem('sahil_visitor_session',visitorId); }
    db.from('page_views').insert({path:loc.pathname.slice(0,160),visitor_id:visitorId}).then(()=>{});
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
    <span className="brand-word">SAHIL<span className="brand-dot">.</span><small>INDEPENDENT STUDIO</small></span>
  </Link>;
}
function Header() {
  const {settings}=useData();
  const [menu,setMenu]=useState(false);
  const loc=useLocation();
  useEffect(()=>setMenu(false),[loc.pathname]);
  const nav=[['/','Home'],['/work','Work'],['/services','Expertise'],['/learning','Learning'],['/resources','Resources'],['/about','About']];
  return <header className="site-header"><div className="wide header-layout">
    <Brand/>
    <nav className={'nav-links '+(menu?'nav-open':'')} aria-label="Main navigation">
      {nav.map(([to,label])=><NavLink key={to} to={to} end={to==='/'} className={({isActive})=>isActive?'active':''}>{label}</NavLink>)}
      <Link to="/contact" className="mobile-contact">Start a project <ArrowUpRight size={15}/></Link>
    </nav>
    <Link className="header-cta" to="/contact"><span>Let's talk</span><ArrowUpRight size={16}/></Link>
    <button className="nav-toggle" aria-label={menu?'Close navigation':'Open navigation'} aria-expanded={menu} onClick={()=>setMenu(!menu)}>{menu?<X size={24}/>:<Menu size={24}/>}</button>
  </div></header>;
}
function Footer() {
  const {settings}=useData();
  return <footer className="site-footer"><div className="wide">
    <div className="footer-top"><div><p className="eyebrow"><span className="green-dot"/> HAVE SOMETHING IN MIND?</p><h2>Let's make<br/><em>something matter.</em></h2><Link to="/contact" className="text-link large-link">Start a conversation <ArrowUpRight size={22}/></Link></div>
    <div className="footer-right"><p>Independent development /<br/>Digital experiences / AI workflows</p><div className="footer-socials">{socialMeta.map(([id,Icon,name])=><LinkOut href={settings[id]} key={id} className="social-icon" aria-label={name}><Icon size={18}/></LinkOut>)}</div></div></div>
    <div className="footer-bottom"><Brand/><span>© {new Date().getFullYear()} Muhammad Sahil. All rights reserved.</span><div><Link to="/admin">Studio admin</Link><a href="#top">Back to top ↑</a></div></div>
  </div></footer>;
}
function Shell({children}) { return <div id="top" className="site-shell"><Header/><main>{children}</main><Footer/></div>; }
function Eyebrow({children,number}) {return <div className="eyebrow"><span className="small-star">✳</span>{number&&<span className="muted-number">{number} /</span>}{children}</div>;}
function SectionTop({kicker,title,description,link,linkText='View all'}) {return <div className="section-heading"><div><Eyebrow>{kicker}</Eyebrow><h2>{title}</h2>{description&&<p>{description}</p>}</div>{link&&<Link to={link} className="text-link">{linkText}<ArrowUpRight size={17}/></Link>}</div>;}
function Cta({to,children,secondary=false}) { return <Link to={to} className={'btn '+(secondary?'btn-secondary':'btn-primary')}>{children}<ArrowUpRight size={17}/></Link>; }
function Progress({small=false}) { const {settings}=useData(); const day=Math.min(100,Math.max(0,Number(settings.challengeDay)||0)); const total=Math.max(1,Number(settings.challengeTotal)||90); return <div className={'progress-widget '+(small?'progress-small':'')}><div className="progress-top"><span>THE PUBLIC BUILD LOG</span><strong>DAY {String(day).padStart(2,'0')} <span>/ {total}</span></strong></div><div className="progress-track"><i style={{width:`${Math.min(100,day/total*100)}%`}} /></div><div className="progress-bottom"><span>Learn · Build · Share</span><Link to="/learning">Follow the journey <ArrowUpRight size={13}/></Link></div></div>; }
function HeroArtwork() {
  const {settings}=useData(); const outer=useRef(null);
  const [pos,setPos]=useState({x:0,y:0});
  const move=e=>{if(!outer.current)return;const r=outer.current.getBoundingClientRect();setPos({x:((e.clientX-r.left)/r.width-.5)*11,y:((e.clientY-r.top)/r.height-.5)*-11});};
  return <div className="hero-artwork" ref={outer} onPointerMove={move} onPointerLeave={()=>setPos({x:0,y:0})} aria-label="Decorative layered project visualization">
    <div className="orb-halo"/><div className="orbit orbit-one"/><div className="orbit orbit-two"/>
    <div className="art-perspective" style={{transform:`rotateX(${pos.y}deg) rotateY(${pos.x}deg)`}}>
      <div className="art-back-card"><div className="art-back-grid"/><div className="art-glow"/></div>
      <div className="art-main-card"><div className="art-topline"><span><i/> CURRENTLY CREATING</span><span>EST. 2025</span></div>
        {settings.image1?<img className="hero-uploaded-photo" src={settings.image1} alt="Muhammad Sahil"/>:<div className="art-monogram"><span className="art-smaller">INDEPENDENT</span><strong>S<span>✳</span></strong><span className="art-smaller align-end">DIGITAL MAKER</span></div>}
        <div className="art-card-footer"><span>DESIGN / CODE / INTELLIGENCE</span><span>01—∞</span></div></div>
      <div className="art-float-card"><Sparkles size={18}/><span>Ideas into<br/><strong>experiences.</strong></span><ArrowUpRight size={16}/></div>
      <div className="art-coordinate">28°37′N <br/>77°25′E</div>
    </div><div className="art-caption">CRAFTED WITH INTENTION <span>↗</span></div>
  </div>;
}
function Hero() {const {settings}=useData();return <section className="hero"><div className="hero-noise"/><div className="wide hero-grid">
  <div className="hero-copy"><div className="availability"><span className="pulse-dot"/>{settings.availability}</div>
    <div className="hero-index">INDEPENDENT DEVELOPER <span>—</span> INDIA / WORLDWIDE</div>
    <h1>{settings.heroTitle.includes('what’s')?< >Designing<br/>what’s <em>next.</em></>:settings.heroTitle}</h1>
    <p className="hero-lead">{settings.intro}</p>
    <div className="hero-actions"><Cta to="/work">Explore my work</Cta><Link to="/contact" className="minimal-link">Start a project <ArrowUpRight size={16}/></Link></div>
    <div className="hero-stats"><div><strong>{settings.experience}</strong><span>YEARS OF<br/>HANDS-ON EXPERIENCE</span></div><div><strong>90<span className="gold">/</span></strong><span>DAYS TO LEARN,<br/>BUILD & DOCUMENT</span></div></div>
  </div><HeroArtwork/></div><div className="wide hero-bottom"><span><MousePointer2 size={15}/> EXPLORE THE STUDIO</span><span>SCROLL TO DISCOVER <ArrowDownRight size={17}/></span></div></section>}
function Marquee() {return <div className="marquee"><div className="marquee-inner">{Array.from({length:4},(_,i)=><span key={i}>WEB DEVELOPMENT <span>✳</span> AI AUTOMATION <span>✳</span> INTERFACE DESIGN <span>✳</span> BUILDING IN PUBLIC <span>✳</span></span>)}</div></div>}
function ProjectArtwork({item,index}) {return <div className={'project-art project-art-'+index}>{item.image_url?<img src={item.image_url} alt={item.title} loading="lazy"/>:<div className="mock-work"><div className="mock-browser"><i/><i/><i/><span>{item.title.replace(/\s+/g,'_').toLowerCase()}.app</span></div><div className="mock-content"><div className="mock-panel small-mock"><span>0{index+1} / PROJECT</span><b>{item.title.slice(0,18)}</b><span className="mock-line"/><span className="mock-line shorter"/></div><div className="mock-panel chart-mock"><span>FUNCTIONAL SYSTEMS</span><div className="mock-bars">{[40,75,50,92,67,86,56].map((h,i)=><i key={i} style={{height:`${h}%`}}/>)}</div></div></div></div>}<div className="project-art-label"><span>MS / SELECTED WORK</span><span>0{index+1}</span></div></div>}
function ProjectCard({item,index=0}) {return <article className="project-card"><ProjectArtwork item={item} index={index%4}/><div className="project-info"><div><div className="card-eyebrow">{item.category}</div><h3>{item.title}</h3><p>{item.description}</p><div className="tech-tags">{(item.tech||'').split('·').filter(Boolean).map(t=><span key={t}>{t.trim()}</span>)}</div></div><div className="project-actions">{safeExternal(item.url)?<LinkOut href={item.url} className="round-arrow" aria-label={`Visit ${item.title}`}><ArrowUpRight size={21}/></LinkOut>:<span className="round-arrow passive" title="Live demo link to be added"><ArrowUpRight size={21}/></span>}{safeExternal(item.repo_url)&&<LinkOut href={item.repo_url} className="project-github" aria-label="View source"><Github size={19}/></LinkOut>}</div></div><div className="project-status"><span className="tiny-dot"/>{item.status}</div></article>}
function ServiceIcon({name,size=26}) {return name==='workflow'?<Workflow size={size}/>:name==='layers'?<Layers3 size={size}/>:name==='globe'?<Globe2 size={size}/>:<Code2 size={size}/>;}
function ServicesPreview() {const {items}=useData();return <section className="paper-section"><div className="wide"><SectionTop kicker="WHAT I DO" title={<>Building solutions,<br/><em>not just screens.</em></>} description="From first sketch to working product. A focused set of capabilities, built around the outcome." link="/services"/>
  <div className="service-grid">{published(items.services).slice(0,3).map((s,i)=><Link to="/services" key={s.id} className="service-card"><div className="service-top"><span>{s.category}</span><ArrowUpRight size={19}/></div><div className="service-icon"><ServiceIcon name={s.icon}/></div><h3>{s.title}</h3><p>{s.description}</p><div className="service-index">0{i+1}</div></Link>)}</div></div></section>}
function WorkPreview() {const {items}=useData();return <section className="dark-section work-section"><div className="wide"><SectionTop kicker="SELECTED PROJECTS" title={<>Proof in the <em>process.</em></>} description="Products, prototypes and real solutions — a look at what I’m building and refining." link="/work" linkText="All projects"/><div className="work-grid">{published(items.projects).slice(0,4).map((p,i)=><ProjectCard key={p.id} item={p} index={i}/>)}</div></div></section>}
function LearningPreview() {const {items}=useData();return <section className="paper-section learning-section"><div className="wide"><SectionTop kicker="LEARNING OUT LOUD" title={<>90 days. <em>Real progress.</em></>} description="Not a highlight reel. Notes, breakthroughs, failures and projects — shared as they happen." link="/learning" linkText="Explore learning log"/><div className="learning-layout"><Progress/><div className="learning-list">{published(items.learning).slice(0,3).map((l,i)=><Link to="/learning" className="learning-row" key={l.id}><span className="learning-day">DAY {String(l.day_number||i+1).padStart(2,'0')}</span><div><span className="card-eyebrow">{l.category}</span><h3>{l.title}</h3><p>{l.description}</p></div><ArrowUpRight size={20}/></Link>)}</div></div></div></section>}
function ResourceCard({item}) {return <Link to={`/resources/${item.slug}`} className="resource-card"><div className="resource-card-top"><div className="resource-symbol"><FileText size={28}/></div><span>{item.file_url?'DOWNLOADABLE PDF':'COMING SOON'}</span></div><div className="card-eyebrow">{item.category}</div><h3>{item.title}</h3><p>{item.description}</p><div className="resource-card-bottom"><span>{item.file_url?'Open resource':'Preview details'}</span><ArrowUpRight size={20}/></div></Link>}
function ResourcesPreview() {const {items}=useData();return <section className="resources-strip"><div className="wide resource-strip-inner"><div><Eyebrow>FREE RESOURCES</Eyebrow><h2>Make the process<br/><em>accessible.</em></h2><p>Templates, pitch documents and actionable frameworks — practical learning, free to access.</p><Cta to="/resources" secondary>Explore resource library</Cta></div><div className="resource-preview-art"><div className="document-back"/><div className="document-front"><div className="doc-top"><span>MS / RESOURCE LIBRARY</span><FileDown size={22}/></div><div className="doc-title">THE<br/>PLAYBOOK<span>.</span></div><div className="doc-rule"/><p>Ideas to execution.<br/>One document at a time.</p><div className="doc-bottom"><span>SHARE WHAT YOU LEARN</span><ArrowUpRight size={28}/></div></div></div></div></section>}
function Home() {const {items}=useData();return <Shell><Hero/><Marquee/><ServicesPreview/><WorkPreview/><LearningPreview/><ResourcesPreview/>{published(items.offers).length>0&&<OffersBlock/>}</Shell>}
function PageTitle({kicker,title,description,aside}) {return <div className="page-title-wrap"><div className="wide page-title-grid"><div><Eyebrow>{kicker}</Eyebrow><h1>{title}</h1></div><div className="page-title-aside"><p>{description}</p>{aside}</div></div></div>}
function Work() {const {items}=useData();return <Shell><PageTitle kicker="01 / SELECTED WORK" title={<>Making ideas<br/><em>real.</em></>} description="An evolving collection of useful products, experiments and the systems behind them."/><section className="dark-section page-content"><div className="wide"><div className="results-meta"><span>PROJECT ARCHIVE</span><span>{published(items.projects).length.toString().padStart(2,'0')} ITEMS</span></div><div className="work-grid">{published(items.projects).map((p,i)=><ProjectCard key={p.id} item={p} index={i}/>)}</div>{!published(items.projects).length&&<Empty label="Projects will appear here soon."/>}</div></section></Shell>}
function Services() {const {items}=useData();return <Shell><PageTitle kicker="02 / EXPERTISE" title={<>Independent thinking.<br/><em>Full-stack execution.</em></>} description="Focused, flexible solutions for businesses who need a website, an interface, or a smarter way of working."/><section className="paper-section page-content"><div className="wide"><div className="service-grid">{published(items.services).map((s,i)=><article className="service-card" key={s.id}><div className="service-top"><span>{s.category}</span><span>0{i+1}</span></div><div className="service-icon"><ServiceIcon name={s.icon}/></div><h3>{s.title}</h3><p>{s.description}</p><Link className="text-link" to="/contact">Discuss this service <ArrowUpRight size={16}/></Link></article>)}</div><div className="method-block"><Eyebrow>HOW I APPROACH WORK</Eyebrow><div className="method-steps">{[['01','Discover','Understand the actual problem and what success looks like.'],['02','Design','Map out clear journeys and a purposeful interface.'],['03','Develop','Build, test and integrate the working solution.'],['04','Refine','Iterate from feedback and prepare for launch.']].map(x=><div key={x[0]}><span>{x[0]}</span><h3>{x[1]}</h3><p>{x[2]}</p></div>)}</div></div></div></section><OffersBlock/></Shell>}
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
function About() {const {settings}=useData();return <Shell><PageTitle kicker="05 / BEHIND THE WORK" title={<>Curious by nature.<br/><em>Driven to build.</em></>} description="A little more about the person, the principles and the ambition behind the digital work."/><section className="paper-section about-main"><div className="wide about-grid"><div className="about-portrait">{settings.image2?<img src={settings.image2} alt="Muhammad Sahil portrait"/>:<div className="portrait-placeholder"><strong>MS<span>.</span></strong><div>PERSON / PROCESS / PURPOSE</div></div>}<div className="portrait-tag">MUHAMMAD SAHIL <span>↗</span></div></div><div className="about-copy"><Eyebrow>MY STORY</Eyebrow><h2>I care about the<br/><em>details that count.</em></h2><p>{settings.about}</p><p>My focus today: development, thoughtful product experiences, and using AI where it genuinely improves a workflow.</p><div className="about-facts"><div><strong>{settings.experience}</strong><span>YEAR OF EXPERIENCE</span></div><div><strong>{settings.challengeTotal}</strong><span>DAY BUILD CHALLENGE</span></div></div><Cta to="/contact">Work with me</Cta></div></div>
  <div className="wide about-second"><div>{settings.image3?<img src={settings.image3} alt="Behind the scenes of building projects"/>:<div className="about-visual"><span>01 / RESEARCH</span><span>02 / DESIGN</span><span>03 / BUILD</span><span>04 / LEARN</span><strong>ALWAYS<br/>IN MOTION.</strong></div>}</div><div><Eyebrow>WHAT I BELIEVE</Eyebrow><h3>Less noise.<br/>More meaningful work.</h3><p>Great experiences aren't about using every trendy effect. They come from knowing what matters, making deliberate decisions and executing reliably.</p><div className="principles"><span><Check size={17}/> Design with intention</span><span><Check size={17}/> Communicate clearly</span><span><Check size={17}/> Ship and iterate</span></div></div></div></section></Shell>}
function OffersBlock() {const {items}=useData();const offers=published(items.offers);if(!offers.length)return null;return <section className="offers-block"><div className="wide"><SectionTop kicker="CURRENT OPPORTUNITIES" title={<>What's <em>available.</em></>} description="A small selection of current service offerings and collaboration opportunities."/><div className="offers-grid">{offers.map(o=><article className="offer-card" key={o.id}><Zap size={23}/><h3>{o.title}</h3><p>{o.description}</p>{safeExternal(o.action_url)?<LinkOut href={o.action_url} className="text-link">{o.action_label}<ArrowUpRight size={17}/></LinkOut>:<Link to="/contact" className="text-link">{o.action_label}<ArrowUpRight size={17}/></Link>}</article>)}</div></div></section>}
function Contact() {
  const {settings}=useData();const [form,setForm]=useState({name:'',email:'',project_type:'Website Development',message:'',website:''});const [status,setStatus]=useState('');const [busy,setBusy]=useState(false);
  const update=e=>setForm(x=>({...x,[e.target.name]:e.target.value}));
  const submit=async e=>{e.preventDefault();if(form.website)return;if(!db){setStatus('Contact form needs Supabase configuration. Please use the email link if available.');return;}setBusy(true);setStatus('');
    const {error}=await db.from('contact_messages').insert({name:form.name.trim(),email:form.email.trim(),project_type:form.project_type,message:form.message.trim()});
    if(error)setStatus('Message not sent. '+errText(error));else{setStatus('Thank you. Your message has been received.');setForm({name:'',email:'',project_type:'Website Development',message:'',website:''});}setBusy(false);
  };
  return <Shell><PageTitle kicker="06 / GET IN TOUCH" title={<>Let's build<br/><em>something useful.</em></>} description="Tell me about the idea, the problem or the workflow. I’ll help you find a practical starting point."/><section className="paper-section contact-section"><div className="wide contact-grid"><div className="contact-aside"><span className="card-eyebrow">OPEN FOR COLLABORATION</span><h2>Good projects start<br/>with a conversation.</h2><p>{settings.location}</p>{emailHref(settings.email)&&<a className="contact-mail" href={emailHref(settings.email)}>{settings.email}<ArrowUpRight size={17}/></a>}<div className="contact-socials">{socialMeta.map(([id,Icon,name])=><LinkOut key={id} href={settings[id]} className="social-icon" aria-label={name}><Icon size={20}/></LinkOut>)}</div><div className="contact-side-art"><span>YOUR IDEA</span><span>+</span><span>MY EXECUTION</span><span>=</span><strong>SOMETHING REAL.</strong></div></div><form className="contact-form" onSubmit={submit}><Eyebrow>START YOUR PROJECT</Eyebrow><div className="two-col"><label>Your name<input required minLength={2} maxLength={100} name="name" value={form.name} onChange={update} placeholder="How should I call you?"/></label><label>Email address<input required type="email" maxLength={254} name="email" value={form.email} onChange={update} placeholder="you@company.com"/></label></div><label>What can I help with?<select name="project_type" value={form.project_type} onChange={update}><option>Website Development</option><option>AI Workflow Automation</option><option>UI / UX Design</option><option>Other Collaboration</option></select></label><label>Tell me a little about your project<textarea required minLength={10} maxLength={3000} rows={6} name="message" value={form.message} onChange={update} placeholder="The problem you're trying to solve, your timeline, or a rough idea…"/></label><input className="honeypot" tabIndex={-1} autoComplete="off" name="website" value={form.website} onChange={update} aria-hidden="true"/><button className="btn btn-primary send-button" type="submit" disabled={busy}>{busy?'Sending…':'Send inquiry'}<Send size={18}/></button><span className="form-smallprint">Your details will be used only to respond to this inquiry.</span>{status&&<p role="status" className={'form-message '+(status.startsWith('Thank')?'success':'error')}>{status}</p>}</form></div></section></Shell>
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
  ['email','Contact email'],['instagram','Instagram URL'],['youtube','YouTube URL'],['github','GitHub URL'],['linkedin','LinkedIn URL'],['calendarUrl','Booking link'],['footerNote','Footer line']
];
const starterItem = name => ({
  services:{title:'New service',category:'SPECIALTY',description:'',icon:'code',position:99,published:true},
  projects:{title:'New project',category:'WEB / PRODUCT',description:'',tech:'',status:'IN PROGRESS',url:'',repo_url:'',image_url:'',featured:false,position:99,published:true},
  learning:{title:'New learning entry',category:'BUILD JOURNAL',description:'',day_number:1,resource_url:'',position:99,published:true},
  resources:{title:'New resource',slug:'new-resource-'+Date.now().toString().slice(-6),category:'FREE GUIDE',description:'',file_url:'',file_path:'',position:99,published:true},
  offers:{title:'New offer',description:'',action_label:'Let’s talk',action_url:'',position:99,published:true}
}[name]);
async function mediaUpload(file,bucket){
  if(!db)throw new Error('Supabase not configured.');
  if(file.size>10*1024*1024)throw new Error('File is larger than 10MB. Compress it before uploading.');
  const allowed=bucket==='portfolio-pdfs'?['application/pdf']:['image/png','image/jpeg','image/webp','image/avif','image/svg+xml'];
  if(!allowed.includes(file.type))throw new Error('Unsupported file type. Use '+(bucket==='portfolio-pdfs'?'PDF.':'JPG, PNG, WebP, AVIF or SVG.'));
  const ext=(file.name.split('.').pop()||'file').toLowerCase().replace(/[^a-z0-9]/g,'');
  const path=`uploads/${crypto.randomUUID()}.${ext}`;
  const {error}=await db.storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false,cacheControl:'3600'});
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
  const [busy,setBusy]=useState(false);
  const go=async()=>{if(!db)return;setBusy(true);const {error}=await db.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin+after}});if(error){alert(errText(error));setBusy(false);}};
  return <button className="btn btn-primary" disabled={!db||busy} onClick={go} type="button"><LogIn size={18}/>{busy?'Redirecting…':children}</button>;
}
function Admin() {
  const {session,refresh,configured,dataError}=useData();const [allowed,setAllowed]=useState(null);const [tab,setTab]=useState('overview');
  useEffect(()=>{if(!db||!session){setAllowed(false);return;}setAllowed(null);db.rpc('is_admin').then(({data,error})=>setAllowed(!error&&data===true));},[session?.user?.id]);
  if(!configured)return <div className="admin-gate"><Brand/><div className="gate-card"><Settings2 size={31}/><h1>Connect your portfolio backend.</h1><p>The website preview works now. To activate uploads, Google login, analytics and the dashboard, set up Supabase and add the environment variables in <code>.env</code>.</p><Link to="/" className="text-link"><ArrowLeft size={17}/> View website</Link></div></div>;
  if(!session)return <div className="admin-gate"><Brand/><div className="gate-card"><LockKeyhole size={33}/><div className="card-eyebrow">PRIVATE STUDIO ACCESS</div><h1>Welcome back,<br/>creator.</h1><p>Sign in with the Google account approved for this portfolio. Admin permissions are checked in the database.</p><SignInButton/><Link to="/" className="back-to-home"><ArrowLeft size={15}/> Back to portfolio</Link></div></div>;
  if(allowed===null)return <div className="admin-gate"><div className="gate-card"><span className="spin-dot"/> Verifying your studio access…</div></div>;
  if(!allowed)return <div className="admin-gate"><Brand/><div className="gate-card"><ShieldCheck size={32}/><h1>Signed in, not an admin.</h1><p>{session.user.email} is authenticated, but it is not on the private admin allowlist. Only the account owner can enable administrator access in Supabase SQL Editor.</p><button className="btn btn-primary" onClick={()=>db.auth.signOut()}>Sign out</button><Link to="/" className="back-to-home">Return to site</Link></div></div>;
  const tabs=[['overview','Overview',LayoutDashboard],['settings','Site content',Settings2],['media','Photos & logo',UploadCloud],['services','Services',Layers3],['projects','Projects',Code2],['learning','Learning log',Compass],['resources','PDF resources',FileDown],['offers','Offers',Zap],['messages','Inquiries',Mail],['audience','Audience',Users]];
  return <div className="admin-layout"><aside className="admin-sidebar"><Brand light/><div className="admin-sidebar-sub">PRIVATE CONTENT STUDIO</div><nav>{tabs.map(([id,label,Icon])=><button key={id} className={tab===id?'selected':''} onClick={()=>setTab(id)}><Icon size={17}/>{label}</button>)}</nav><div className="admin-sidebar-bottom"><Link to="/"><ExternalLink size={17}/> View live site</Link><button onClick={()=>db.auth.signOut()}><LogOut size={17}/> Sign out</button></div></aside><div className="admin-main"><header className="admin-topbar"><div><span className="green-dot"/> WEBSITE MANAGEMENT SYSTEM</div><div className="admin-account"><span>{session.user.email}</span><button onClick={refresh} title="Refresh content"><RotateCcw size={17}/></button></div></header><div className="admin-mobile-nav"><select aria-label="Choose dashboard section" value={tab} onChange={e=>setTab(e.target.value)}>{tabs.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select><Link to="/">View site ↗</Link></div><main className="admin-content">{dataError&&<p className="admin-warning">Supabase request failed: {dataError}. Verify that you ran setup.sql and configured the public key.</p>}
    {tab==='overview'?<AdminOverview onNavigate={setTab}/>:tab==='settings'?<SettingsEditor/>:tab==='media'?<MediaEditor/>:collections.includes(tab)?<CollectionEditor key={tab} name={tab}/>:tab==='messages'?<AdminMessages/>:tab==='audience'?<AdminAudience/>:null}</main></div></div>;
}
function AdminHeader({eyebrow,title,description,action}){return <div className="admin-heading"><div><div className="card-eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>}
function AdminOverview({onNavigate}) {
  const {items,settings}=useData();const [numbers,setNumbers]=useState({});
  useEffect(()=>{if(!db)return;Promise.all(['page_views','contact_messages','member_profiles'].map(name=>db.from(name).select('*',{count:'exact',head:true}))).then(result=>setNumbers({views:result[0].count??'—',inquiries:result[1].count??'—',members:result[2].count??'—'}));},[]);
  const cards=[['Page views (not unique)',numbers.views??'…',Eye],['Member logins',numbers.members??'…',Users],['Client inquiries',numbers.inquiries??'…',Mail],['PDF resources',items.resources.length,FileDown]];
  return <><AdminHeader eyebrow="OVERVIEW" title="Your studio, at a glance." description="Live website content, public engagement and editorial tools in one place."/><div className="metric-grid">{cards.map(([label,value,Icon])=><div className="metric-card" key={label}><Icon size={22}/><strong>{value}</strong><span>{label}</span></div>)}</div><div className="admin-panel"><div className="admin-panel-head"><h2>Quick actions</h2><span>MANAGE & PUBLISH</span></div><div className="quick-actions">{[['media','Update portrait or logo',UploadCloud],['projects','Add a new project',Code2],['resources','Publish a free PDF',FileDown],['services','Edit your services',BriefcaseBusiness],['settings','Update 90-day challenge',Settings2],['messages','Review client inquiries',Mail]].map(([id,label,Icon])=><button key={id} onClick={()=>onNavigate(id)}><Icon size={20}/>{label}<ArrowUpRight size={17}/></button>)}</div></div><div className="admin-info-row"><div className="admin-panel"><h3>Challenge status</h3><p>Update the day number as your daily content moves forward.</p><h2 className="admin-challenge">Day {settings.challengeDay} <span>/ {settings.challengeTotal}</span></h2></div><div className="admin-panel"><h3>Data and privacy</h3><p>Visitors can download public PDFs without signing in. Member email addresses are visible privately; only opted-in contacts should receive marketing communications.</p></div></div></>;
}
function EditorField({label,type='text',value,onChange,disabled=false}){
  if(type==='hidden')return null;
  return <label className="editor-label"><span>{label}</span>{type==='textarea'?<textarea rows={4} value={value??''} onChange={e=>onChange(e.target.value)} disabled={disabled}/>:type==='boolean'?<div className="boolean-field"><input type="checkbox" checked={value===true} onChange={e=>onChange(e.target.checked)} disabled={disabled}/><span>{value?'Visible / enabled':'Hidden / disabled'}</span></div>:type.startsWith('select:')?<select value={value||''} onChange={e=>onChange(e.target.value)}>{type.slice(7).split('|').map(opt=><option key={opt}>{opt}</option>)}</select>:<input type={type==='number'?'number':'text'} value={value??''} onChange={e=>onChange(type==='number'?Number(e.target.value):e.target.value)} disabled={disabled}/>}</label>;
}
function SettingsEditor(){const {settings,setSettings}=useData();const [draft,setDraft]=useState(settings);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  useEffect(()=>setDraft(settings),[settings]);
  const save=async e=>{e.preventDefault();setBusy(true);setMessage('');const {error}=await db.from('site_settings').update({data:draft,updated_at:new Date().toISOString()}).eq('id',1);if(error)setMessage(errText(error));else{setSettings(draft);setMessage('Changes published successfully.');}setBusy(false);};
  return <><AdminHeader eyebrow="GLOBAL EDITOR" title="Website content" description="Edit your headline, about text, challenge progress and social links. Changes appear on the public site."/><form className="admin-panel admin-form" onSubmit={save}><div className="form-fields-grid">{settingsFields.map(([k,label,type])=><EditorField key={k} label={label} type={type} value={draft[k]} onChange={v=>setDraft(x=>({...x,[k]:v}))}/>)}</div><button className="btn btn-primary" disabled={busy} type="submit"><Check size={17}/>{busy?'Publishing…':'Save & publish'}</button>{message&&<p className={'form-message '+(message.startsWith('Changes')?'success':'error')}>{message}</p>}</form></>;
}
function MediaEditor() {const {settings,setSettings}=useData();const [busy,setBusy]=useState('');const [notice,setNotice]=useState('');
  const media=[['logo','Brand logo','SVG, PNG or WebP — compact, transparent artwork is best'],['image1','Hero artwork','Your main portrait / personal image'],['image2','About portrait','Your second image, featured on the About page'],['image3','Behind-the-scenes image','A desk, working environment or personal project photo']];
  const persist=async (slot,urlValue)=>{const data={...settings,[slot]:urlValue};const {error}=await db.from('site_settings').update({data,updated_at:new Date().toISOString()}).eq('id',1);if(error)throw error;setSettings(data);};
  const add=async (slot,file)=>{if(!file)return;setBusy(slot);setNotice('');try{const newFile=await mediaUpload(file,'portfolio-media');const old=settings[slot];try{await persist(slot,newFile.url);}catch(err){await removeMediaUrl(newFile.url,'portfolio-media');throw err;}if(old&&old!==newFile.url)await removeMediaUrl(old,'portfolio-media');setNotice('Image updated successfully.');}catch(err){setNotice(errText(err));}setBusy('');};
  const remove=async slot=>{if(!window.confirm('Remove this image from your website?'))return;setBusy(slot);setNotice('');try{const old=settings[slot];await persist(slot,'');await removeMediaUrl(old,'portfolio-media');setNotice('Image removed.');}catch(err){setNotice(errText(err));}setBusy('');};
  return <><AdminHeader eyebrow="MEDIA LIBRARY" title="Your visual identity" description="Upload, replace or remove each image individually. Maximum 10 MB per file. Use your own image rights."/><div className="media-grid">{media.map(([slot,title,caption])=><article className="admin-panel media-item" key={slot}><div className="media-preview">{settings[slot]?<img src={settings[slot]} alt={title}/>:<div><UploadCloud size={36}/><span>NO IMAGE UPLOADED</span></div>}</div><h3>{title}</h3><p>{caption}</p><div className="media-actions"><label className="admin-file-btn"><UploadCloud size={16}/>{busy===slot?'Uploading…':'Upload / replace'}<input aria-label={'Upload '+title} type="file" disabled={!!busy} accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml" onChange={e=>{add(slot,e.target.files[0]);e.target.value='';}}/></label>{settings[slot]&&<button className="danger-outline" disabled={!!busy} onClick={()=>remove(slot)}><Trash2 size={16}/> Remove</button>}</div></article>)}</div>{notice&&<p role="status" className="form-message">{notice}</p>}</>;
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
function AdminMessages(){const [messages,setMessages]=useState([]);const [busy,setBusy]=useState(true);const [error,setError]=useState('');
  const load=async()=>{const {data,error}=await db.from('contact_messages').select('*').order('created_at',{ascending:false}).limit(200);setMessages(data||[]);setError(error?errText(error):'');setBusy(false);};
  useEffect(()=>{load();},[]);
  const remove=async id=>{if(!confirm('Permanently delete this inquiry?'))return;const {error}=await db.from('contact_messages').delete().eq('id',id);if(error)setError(errText(error));else load();};
  return <><AdminHeader eyebrow="INBOX" title="Client inquiries" description="Messages submitted via your public contact form. Replies are sent from your email application."/>{error&&<p className="form-message error">{error}</p>}<div className="admin-panel">{busy?<p>Loading messages…</p>:messages.length?messages.map(m=><article className="message-card" key={m.id}><div className="message-head"><strong>{m.name}</strong><span>{fmtDate(m.created_at)}</span></div><div className="card-eyebrow">{m.project_type}</div><p>{m.message}</p><div className="message-actions"><a href={`mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent('Re: Your website inquiry')}`} className="text-link"><Mail size={16}/>{m.email}</a><button onClick={()=>remove(m.id)}><Trash2 size={16}/> Delete</button></div></article>):<Empty label="No inquiries yet."/>}</div></>;
}
function AdminAudience() {const [members,setMembers]=useState([]);const [error,setError]=useState('');const [busy,setBusy]=useState(true);const [onlyOpted,setOnlyOpted]=useState(false);
  useEffect(()=>{db.from('member_profiles').select('*').order('created_at',{ascending:false}).limit(1000).then(({data,error})=>{setMembers(data||[]);setError(error?errText(error):'');setBusy(false);});},[]);
  const optins=members.filter(m=>m.marketing_opt_in);
  const visible=onlyOpted?optins:members;
  const exportCsv=()=>{const csv=[['email','name','opted_in','created_at'],...visible.map(m=>[m.email,m.full_name,m.marketing_opt_in?'YES':'NO',m.created_at])].map(row=>row.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='sahil-audience.csv';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);};
  return <><AdminHeader eyebrow="MEMBER ANALYTICS" title="Your audience" description="Private list of users who voluntarily signed in with Google. Marketing permission is recorded separately."/><div className="metric-grid mini-metrics"><div className="metric-card"><Users size={20}/><strong>{members.length}</strong><span>Google logins</span></div><div className="metric-card"><CheckCircle2 size={20}/><strong>{optins.length}</strong><span>Marketing opt-ins</span></div></div><div className="admin-panel"><div className="admin-panel-head"><h2>Registered members</h2><div className="audience-tools"><label><input type="checkbox" checked={onlyOpted} onChange={e=>setOnlyOpted(e.target.checked)}/> Marketing opt-ins only</label><button className="admin-file-btn" onClick={exportCsv} disabled={!visible.length}><Download size={15}/> Export CSV</button></div></div><p className="privacy-note">Only send bulk promotional emails to members who have explicitly opted in. Google sign-in does not authorize advertising emails.</p>{error&&<p className="form-message error">{error}</p>}{busy?<p>Loading members…</p>:visible.map(m=><div className="data-row" key={m.user_id}><div className="data-row-icon"><Users size={18}/></div><div className="data-row-main"><strong>{m.full_name || 'Community member'}</strong><small>{m.email}</small></div><span className={m.marketing_opt_in?'consent-yes':'consent-no'}>{m.marketing_opt_in?'OPTED IN':'NO CONSENT'}</span></div>)}{!busy&&!visible.length&&<Empty label="No matching sign-ins yet."/>}</div></>;
}
function MemberPage(){const {session}=useData();const [optin,setOptin]=useState(false);const [busy,setBusy]=useState(false);const [saved,setSaved]=useState('');
  useEffect(()=>{if(session?.user&&db)db.from('member_profiles').select('marketing_opt_in').eq('user_id',session.user.id).maybeSingle().then(({data})=>{setOptin(!!data?.marketing_opt_in);});},[session?.user?.id]);
  const save=async()=>{setBusy(true);const {error}=await db.from('member_profiles').update({marketing_opt_in:optin,updated_at:new Date().toISOString()}).eq('user_id',session.user.id);setSaved(error?errText(error):'Your communication preference has been saved.');setBusy(false);};
  return <Shell><section className="member-area"><div className="wide"><div className="member-card"><Eyebrow>THE SAHIL LEARNING COMMUNITY</Eyebrow><h1>Your journey,<br/><em>your choice.</em></h1>{!db?<p>Sign-in is available after the portfolio backend is connected.</p>:!session?<><p>Sign in with Google to join the community. Downloading resources does not require an account.</p><SignInButton after="/community"/></>:<><p>Signed in as <strong>{session.user.email}</strong>. You can manage your preferences below.</p><label className="optin-box"><input type="checkbox" checked={optin} onChange={e=>setOptin(e.target.checked)}/><span>I explicitly agree to receive occasional emails about new learning resources, services and updates. I can withdraw this consent at any time.</span></label><button className="btn btn-primary" disabled={busy} onClick={save}>{busy?'Saving…':'Save preference'}<Check size={16}/></button><button className="signout-link" onClick={()=>db.auth.signOut()}>Sign out</button>{saved&&<p className="form-message">{saved}</p>}</>}</div></div></section></Shell>;
}
function SiteApp(){const location=useLocation();const {loading}=useData();return <><ScrollManager/>{loading&&<div className="first-load-indicator" aria-hidden="true"/>}<Routes><Route path="/" element={<Home/>}/><Route path="/work" element={<Work/>}/><Route path="/services" element={<Services/>}/><Route path="/learning" element={<Learning/>}/><Route path="/resources" element={<Resources/>}/><Route path="/resources/:slug" element={<ResourceDetail/>}/><Route path="/about" element={<About/>}/><Route path="/contact" element={<Contact/>}/><Route path="/admin" element={<Admin/>}/><Route path="/community" element={<MemberPage/>}/><Route path="*" element={<NotFound/>}/></Routes>{!location.pathname.startsWith('/admin')&&<FloatingCommunityLink/>}</>}
function FloatingCommunityLink(){const {session}=useData();return <Link to="/community" className="community-floating"><span className="community-icon"><Sparkles size={16}/></span><span>{session?'My community settings':'Join the learning journey'}</span><ArrowUpRight size={15}/></Link>}

createRoot(document.getElementById('root')).render(<React.StrictMode><DataProvider><BrowserRouter><SiteApp/></BrowserRouter></DataProvider></React.StrictMode>);
