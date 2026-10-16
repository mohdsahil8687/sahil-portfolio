import React,{useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {ArrowUpRight,ArrowRight,ChevronDown,Menu,X,Instagram,Facebook,Linkedin,Github,Code2,Server,Database,Brain,Workflow,ArrowUp,ArrowDown,Plus,Trash2} from 'lucide-react';
import {navigationLinks,navigationActive,resolveNavigation,safeSocialUrl,safeNavDestination} from './navigation-data';
import './navigation.css';

const socialPlatforms=[['instagram','Instagram',Instagram],['facebook','Facebook',Facebook],['linkedin','LinkedIn',Linkedin],['github','GitHub',Github]];
const groupIcons={code:Code2,server:Server,database:Database,brain:Brain};
function SocialDock({settings}) {
  return <div className="fn-socials" aria-label="Social profiles">{socialPlatforms.map(([key,label,Icon])=>{const href=safeSocialUrl(settings[key]);return href?<a key={key} href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label} (opens in new tab)`}><Icon size={16} aria-hidden="true"/><span className="fn-tooltip" aria-hidden="true">{label}<ArrowUpRight size={11}/></span></a>:null;})}</div>;
}
function Destination({to,onNavigate,children,...props}) {
  const loc=useLocation();
  if(safeSocialUrl(to))return <a href={to} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
  return <Link to={to} {...props} onClick={e=>{
    if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    onNavigate?.();
    const [pathname,hash]=to.split('#');
    if(hash&&pathname===loc.pathname){
      requestAnimationFrame(()=>{const el=document.getElementById(hash);if(el){el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});if(!el.hasAttribute('tabindex'))el.setAttribute('tabindex','-1');el.focus({preventScroll:true});}});
    }else if(!hash&&pathname===loc.pathname){
      window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    }
  }}>{children}</Link>;
}

export default function FloatingNavigation({settings,projects=[]}) {
  const location=useLocation();
  const config=useMemo(()=>resolveNavigation(settings.navigation),[settings.navigation]);
  const links=config.links.filter(l=>l.visible).map(l=>navigationLinks.find(n=>n.id===l.id));
  const [mobile,setMobile]=useState(false),[panel,setPanel]=useState(null),[compact,setCompact]=useState(false),[skillsVisible,setSkillsVisible]=useState(false);
  const root=useRef(null),nav=useRef(null),indicator=useRef(null),menuButton=useRef(null),skillsButton=useRef(null),workflowButton=useRef(null),workButton=useRef(null),hoverTimer=useRef(0),pinned=useRef(null);
  const close=()=>{clearTimeout(hoverTimer.current);pinned.current=null;setPanel(null);setMobile(false);};
  const closePanel=ref=>{clearTimeout(hoverTimer.current);pinned.current=null;setPanel(null);ref.current?.focus();};
  const active=navigationActive(location.pathname,skillsVisible);
  const curated=projects.filter(p=>p.published!==false).slice().sort((a,b)=>(a.position??99)-(b.position??99)).slice(0,3);
  useEffect(()=>{close();setSkillsVisible(false);},[location.pathname,location.hash]);
  useEffect(()=>{
    let frame=0;
    const update=()=>{frame=0;const y=window.scrollY;setCompact(prev=>prev?y>36:y>88);if(location.pathname==='/'){
      const skills=document.getElementById('skills');const rect=skills?.getBoundingClientRect();
      setSkillsVisible(!!rect&&rect.top<=window.innerHeight*.36&&rect.bottom>window.innerHeight*.36);
    }};
    const onScroll=()=>{if(!frame)frame=requestAnimationFrame(update);};
    window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('resize',onScroll);update();
    return ()=>{window.removeEventListener('scroll',onScroll);window.removeEventListener('resize',onScroll);cancelAnimationFrame(frame);};
  },[location.pathname]);
  useEffect(()=>{
    const onPointer=e=>{if(!root.current?.contains(e.target))close();};
    const onKey=e=>{if(e.key!=='Escape')return;if(panel){e.preventDefault();closePanel(panel==='skills'?skillsButton:panel==='workflow'?workflowButton:workButton);}else if(mobile){e.preventDefault();setMobile(false);menuButton.current?.focus();}};
    const media=matchMedia('(max-width: 899px)');
    const resize=()=>{close();};
    document.addEventListener('pointerdown',onPointer);document.addEventListener('keydown',onKey);media.addEventListener('change',resize);
    return ()=>{clearTimeout(hoverTimer.current);document.removeEventListener('pointerdown',onPointer);document.removeEventListener('keydown',onKey);media.removeEventListener('change',resize);};
  },[panel,mobile]);
  useLayoutEffect(()=>{
    const move=()=>{const target=nav.current?.querySelector(`[data-nav="${active}"]`);const bar=indicator.current;
      if(!bar)return;
      if(!target){bar.style.opacity='0';return;}
      bar.style.width=`${target.offsetWidth}px`;bar.style.transform=`translateX(${target.offsetLeft}px)`;bar.style.opacity='1';
    };
    move();const observer=new ResizeObserver(move);if(nav.current)observer.observe(nav.current);let cancelled=false;document.fonts?.ready.then(()=>{if(!cancelled)move();});
    return ()=>{cancelled=true;observer.disconnect();};
  },[active,config.links,mobile]);
  const enter=name=>e=>{if(e.pointerType!=='mouse'||pinned.current||!matchMedia('(hover:hover) and (min-width:900px)').matches)return;clearTimeout(hoverTimer.current);setPanel(name);};
  const leave=()=>{if(pinned.current||root.current?.contains(document.activeElement))return;clearTimeout(hoverTimer.current);hoverTimer.current=window.setTimeout(()=>setPanel(null),180);};
  const toggle=name=>{clearTimeout(hoverTimer.current);pinned.current=pinned.current===name?null:name;setPanel(pinned.current);if(matchMedia('(max-width:899px)').matches)setMobile(true);};
  return <><a className="skip-link" href="#main-content">Skip to content</a><div className={`fn-space ${config.workflow.enabled?'fn-space-status':''}`}/><header ref={root} className={`floating-navigation ${compact?'fn-compact':''} ${mobile?'fn-mobile-open':''}`} onBlur={e=>{if(e.relatedTarget&&!e.currentTarget.contains(e.relatedTarget))close();}}>
    <div className="fn-bar">
      <div className="fn-brand-zone"><Destination to="/" onNavigate={close} className="fn-brand" aria-label="Sahil - home"><span className="fn-wordmark" aria-hidden="true">{'SAHIL'.split('').map((letter,index)=><span className="fn-wordmark-letter" style={{'--letter-index':index}} key={index}>{letter}</span>)}</span></Destination>
      {config.workflow.enabled&&<div className="fn-workflow" onPointerEnter={enter('workflow')} onPointerLeave={leave}><button ref={workflowButton} className="fn-status-trigger" aria-expanded={panel==='workflow'} aria-controls="fn-workflow-panel" onClick={()=>toggle('workflow')}><span className="fn-breath"/><span>{config.workflow.label}</span><ChevronDown size={10}/></button></div>}</div>
      <button ref={menuButton} className="fn-menu-button" aria-label={mobile?'Close navigation':'Open navigation'} aria-expanded={mobile} aria-controls="fn-navigation-content" onClick={()=>{setMobile(!mobile);setPanel(null);pinned.current=null;}}>{mobile?<X size={20}/>:<Menu size={20}/>}<span>{mobile?'Close':'Menu'}</span></button>
      <div className="fn-content" id="fn-navigation-content">
        <nav aria-label="Main navigation" className="fn-capsule" ref={nav}><span ref={indicator} className="fn-active-indicator" aria-hidden="true"/>
          <ul>{links.map(l=><li key={l.id} data-nav={l.id} className={active===l.id?'fn-is-active':''} onPointerEnter={l.id==='skills'&&config.showSkillsPreview?enter('skills'):l.id==='work'&&curated.length?enter('work'):undefined} onPointerLeave={leave}>
            {l.id==='skills'&&config.showSkillsPreview?<button className="fn-nav-label" ref={skillsButton} aria-current={active===l.id?'location':undefined} aria-expanded={panel==='skills'} aria-controls="fn-skills-panel" onClick={()=>toggle('skills')}>Skills<ChevronDown size={11}/></button>:<Destination to={l.to} className="fn-nav-label" onNavigate={close} aria-current={active===l.id?'page':undefined}>{l.label}</Destination>}
            {l.id==='work'&&curated.length>0&&<button ref={workButton} className="fn-work-toggle" aria-label="Preview selected projects" aria-controls="fn-work-panel" aria-expanded={panel==='work'} onClick={()=>toggle('work')}><ChevronDown size={11}/></button>}
          </li>)}</ul>
        </nav>
        <div className="fn-actions">{config.showSocials&&<SocialDock settings={settings}/>}<Destination to={config.ctaDestination} className="fn-cta" onNavigate={close}>{config.ctaLabel}<ArrowUpRight size={16}/></Destination></div>
        <div className="fn-mobile-signature"><Link to="/learning" onClick={close}>The build journal <ArrowUpRight size={12}/></Link><span>Made with intention — Muhammad Sahil</span></div>
    <div className={`fn-popover fn-skills-panel ${panel==='skills'?'fn-panel-open':''}`} id="fn-skills-panel" hidden={panel!=='skills'} inert={panel!=='skills'} onPointerEnter={()=>clearTimeout(hoverTimer.current)} onPointerLeave={leave}>
      <div className="fn-panel-heading"><span>THE TOOLKIT / ALWAYS EVOLVING</span><button aria-label="Close skills preview" onClick={()=>closePanel(skillsButton)}><X size={15}/></button></div>
      <div className="fn-skill-groups">{config.skillGroups.map((g,i)=>{const Icon=groupIcons[g.icon];return <div key={i}><h3><Icon size={14}/>{g.title}</h3><ul>{g.technologies.map((t,j)=><li key={j}>{t}</li>)}</ul></div>;})}</div>
      <div className="fn-mini-graph" aria-hidden="true">{['Interface','Logic','Data','Intelligence'].map((t,i)=><React.Fragment key={t}>{i>0&&<i/>}<span><b/>{t}</span></React.Fragment>)}</div>
      <div className="fn-panel-footer"><Destination to="/#skills" onNavigate={close}>Explore My Skills <ArrowRight size={14}/></Destination><Link to="/learning" onClick={close}>Build journal <ArrowUpRight size={12}/></Link></div>
    </div>
    <div className={`fn-popover fn-workflow-panel ${panel==='workflow'?'fn-panel-open':''}`} id="fn-workflow-panel" hidden={panel!=='workflow'} inert={panel!=='workflow'} onPointerEnter={()=>clearTimeout(hoverTimer.current)} onPointerLeave={leave}><div className="fn-panel-heading"><span><Workflow size={13}/> {config.workflow.label}</span><button aria-label="Close current work preview" onClick={()=>closePanel(workflowButton)}><X size={15}/></button></div><div className="fn-workflow-copy"><h3>{config.workflow.title}</h3><p>{config.workflow.description}</p><Destination to="/work#projects" onNavigate={close}>View Projects <ArrowUpRight size={15}/></Destination></div></div>
    <div className={`fn-popover fn-work-panel ${panel==='work'?'fn-panel-open':''}`} id="fn-work-panel" hidden={panel!=='work'} inert={panel!=='work'} onPointerEnter={()=>clearTimeout(hoverTimer.current)} onPointerLeave={leave}><div className="fn-panel-heading"><span>SELECTED WORK / FROM THE STUDIO</span><button aria-label="Close projects preview" onClick={()=>closePanel(workButton)}><X size={15}/></button></div>{curated.map(p=><Destination to="/work#projects" onNavigate={close} className="fn-project-preview" key={p.id}><Code2 size={17}/><span><strong>{p.title}</strong><small>{p.category}</small></span><ArrowUpRight size={14}/></Destination>)}<div className="fn-panel-footer"><Destination to="/work#projects" onNavigate={close}>All projects <ArrowRight size={14}/></Destination></div></div>
      </div>
    </div>
  </header></>;
}

export function NavigationEditor({settings,onSave}) {
  const [draft,setDraft]=useState(()=>structuredClone(resolveNavigation(settings.navigation)));
  const [socials,setSocials]=useState(()=>Object.fromEntries(socialPlatforms.map(([id])=>[id,settings[id]||''])));
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const change=(key,value)=>setDraft(d=>({...d,[key]:value}));
  const move=(i,delta)=>setDraft(d=>{const links=[...d.links];[links[i],links[i+delta]]=[links[i+delta],links[i]];return {...d,links};});
  const save=async e=>{e.preventDefault();setMessage('');if(!safeNavDestination(draft.ctaDestination)){setMessage('Choose an existing destination or a valid HTTPS contact URL.');return;}
    for(const [id,value] of Object.entries(socials)){if(value.trim()&&!safeSocialUrl(value)){setMessage(`Enter a valid HTTP(S) URL for ${id}, or leave it blank.`);return;}}
    if(!draft.links.some(l=>l.visible)){setMessage('Keep at least one navigation link visible.');return;}
    if(draft.workflow.enabled&&!draft.workflow.title.trim()){setMessage('Describe your actual current work before enabling its preview.');return;}
    const cleaned={...draft,skillGroups:draft.skillGroups.map(g=>({...g,technologies:g.technologies.map(t=>t.trim()).filter(Boolean)}))};
    if(cleaned.skillGroups.some(g=>!g.title.trim())){setMessage('Give every skills category a title.');return;}
    setBusy(true);try{await onSave({navigation:cleaned,...Object.fromEntries(Object.entries(socials).map(([id,v])=>[id,v.trim()]))});setMessage('Navigation published.');}catch(e){setMessage(e.message||'Could not save navigation.');}finally{setBusy(false);}
  };
  const field=(key,label)=> <label className="editor-label" key={key}><span>{label}</span><input required value={draft[key]} maxLength={key==='brandTitle'?24:key==='brandSubtitle'?44:200} onChange={e=>change(key,e.target.value)}/></label>;
  return <><div className="admin-heading"><div className="card-eyebrow">NAVIGATION STUDIO</div><h1>Your floating navigation</h1><p>Manage branding, social links and previews. The logo uses Photos & logo. Availability text remains in Site content. Changes publish only after saving.</p></div><form onSubmit={save}><fieldset disabled={busy} className="fn-editor-fieldset"><section className="admin-panel"><h2>Brand & contact</h2><div className="form-fields-grid">{field('brandTitle','Brand title')}{field('brandSubtitle','Brand subtitle')}{field('ctaLabel','Contact CTA label')}{field('ctaDestination','Contact destination (e.g. /contact#inquiry-form or HTTPS URL)')}</div></section>
    <section className="admin-panel"><h2>Navigation order & visibility</h2>{draft.links.map((l,i)=><div className="fn-editor-link" key={l.id}><label><input type="checkbox" checked={l.visible} onChange={e=>change('links',draft.links.map(n=>n.id===l.id?{...n,visible:e.target.checked}:n))}/>{navigationLinks.find(n=>n.id===l.id).label}</label><div><button type="button" disabled={i===0} aria-label={`Move ${l.id} up`} onClick={()=>move(i,-1)}><ArrowUp size={15}/></button><button type="button" disabled={i===draft.links.length-1} aria-label={`Move ${l.id} down`} onClick={()=>move(i,1)}><ArrowDown size={15}/></button></div></div>)}</section>
    <section className="admin-panel"><h2>Social dock</h2><label className="fn-editor-check"><input type="checkbox" checked={draft.showSocials} onChange={e=>change('showSocials',e.target.checked)}/>Show configured social links</label><div className="form-fields-grid">{socialPlatforms.map(([id,label])=><label className="editor-label" key={id}><span>{label} URL (blank hides the icon)</span><input type="url" value={socials[id]} onChange={e=>setSocials(s=>({...s,[id]:e.target.value}))}/></label>)}</div></section>
    <section className="admin-panel"><h2>Current work preview</h2><label className="fn-editor-check"><input type="checkbox" checked={draft.workflow.enabled} onChange={e=>change('workflow',{...draft.workflow,enabled:e.target.checked})}/>Enable a preview of my actual current work</label><div className="form-fields-grid">{[['label','Status label'],['title','What I am actually working on'],['description','Supporting description']].map(([key,label])=><label className="editor-label" key={key}><span>{label}</span><input maxLength={key==='description'?240:80} value={draft.workflow[key]} onChange={e=>change('workflow',{...draft.workflow,[key]:e.target.value})}/></label>)}</div></section>
    <section className="admin-panel"><h2>Skills preview</h2><label className="fn-editor-check"><input type="checkbox" checked={draft.showSkillsPreview} onChange={e=>change('showSkillsPreview',e.target.checked)}/>Show expandable skills preview</label>{draft.skillGroups.map((g,i)=><div className="fn-editor-group" key={i}><div className="form-fields-grid"><label className="editor-label"><span>Category</span><input required maxLength={40} value={g.title} onChange={e=>change('skillGroups',draft.skillGroups.map((n,j)=>j===i?{...n,title:e.target.value}:n))}/></label><label className="editor-label"><span>Symbol</span><select value={g.icon} onChange={e=>change('skillGroups',draft.skillGroups.map((n,j)=>j===i?{...n,icon:e.target.value}:n))}>{Object.keys(groupIcons).map(v=><option key={v}>{v}</option>)}</select></label><label className="editor-label full-field"><span>Tools & honest learning status (one per line)</span><textarea rows={4} value={g.technologies.join('\n')} onChange={e=>change('skillGroups',draft.skillGroups.map((n,j)=>j===i?{...n,technologies:e.target.value.split('\n')}:n))}/></label></div><button type="button" className="fn-editor-remove" disabled={draft.skillGroups.length===1} onClick={()=>change('skillGroups',draft.skillGroups.filter((_,j)=>j!==i))}><Trash2 size={14}/>Remove category</button></div>)}<button type="button" className="btn btn-secondary" disabled={draft.skillGroups.length>=6} onClick={()=>change('skillGroups',[...draft.skillGroups,{title:'New category',icon:'code',technologies:[]}])}><Plus size={14}/>Add category</button></section>
    <button type="submit" className="btn btn-primary">{busy?'Saving…':'Save & publish'}</button></fieldset><p className="form-message" role="status">{message}</p></form></>;
}
