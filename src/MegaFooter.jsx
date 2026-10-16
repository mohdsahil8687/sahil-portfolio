import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {ArrowUp,ArrowUpRight,ArrowRight,Instagram,Facebook,Linkedin,Github,Check} from 'lucide-react';
import {navigationLinks,safeSocialUrl} from './navigation-data';
import {footerDestination,footerProfiles,footerSocials,resolveFooter} from './footer-data';
import FooterFlowVisual from './footer-visual/FooterFlowVisual';
import './footer.css';

const socialIcons={instagram:Instagram,facebook:Facebook,linkedin:Linkedin,github:Github};
const smoothBehavior=win=>win.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';
export function focusInquiryForm(target){const field=target?.querySelector('input[name="name"]');if(!field)return false;field.focus({preventScroll:true});return true;}
export function scrollToPageTop(doc=document,win=window){win.scrollTo({top:0,behavior:smoothBehavior(win)});doc.getElementById('main-content')?.focus({preventScroll:true});}

function FooterLink({to,children,className='',inquiry=false,...props}){
  const location=useLocation(),frame=useRef(0);
  useEffect(()=>()=>cancelAnimationFrame(frame.current),[]);
  if(safeSocialUrl(to))return <a href={to} className={className} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
  return <Link to={to} className={className} state={inquiry?{focusInquiry:true}:undefined} {...props} onClick={e=>{
    if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    const [path,hash]=to.split('#');if(path!==location.pathname)return;
    cancelAnimationFrame(frame.current);frame.current=requestAnimationFrame(()=>{
      if(!hash){scrollToPageTop();return;}
      const target=document.getElementById(hash);if(!target)return;
      window.scrollTo({top:target.getBoundingClientRect().top+window.scrollY-112,behavior:smoothBehavior(window)});
      if(inquiry&&hash==='inquiry-form')focusInquiryForm(target);
      else {const heading=target.querySelector('h1,h2')||target;if(!heading.hasAttribute('tabindex'))heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});}
    });
  }}>{children}</Link>;
}

function FooterSocialDock({profiles}){
  const [dismissed,setDismissed]=useState(false);
  return <div className={`mf-social-dock ${dismissed?'mf-tooltip-dismissed':''}`} onKeyDown={e=>{if(e.key==='Escape')setDismissed(true);}}>{profiles.filter(p=>p.url).map((p,i)=>{const Icon=socialIcons[p.id];return <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer" aria-label={`${p.tooltip} (opens in new tab)`} aria-describedby={`mf-tip-${p.id}`} style={{'--mf-social-index':i}} onPointerEnter={()=>setDismissed(false)} onFocus={()=>setDismissed(false)}><Icon size={18} aria-hidden="true"/><span role="tooltip" id={`mf-tip-${p.id}`} className="mf-social-tooltip">{p.tooltip}<ArrowUpRight size={11} aria-hidden="true"/></span></a>;})}</div>;
}

function useFooterMotion(ref){
  useEffect(()=>{
    const node=ref.current;if(!node||!('IntersectionObserver' in window))return;
    let visible=false,frame=0;
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    const update=()=>{frame=0;if(!visible||document.hidden||media.matches)return;const box=node.getBoundingClientRect();const progress=Math.max(-1,Math.min(1,(window.innerHeight*.5-box.top)/Math.max(1,box.height)));node.style.setProperty('--mf-depth',`${(progress*8).toFixed(2)}px`);};
    const schedule=()=>{if(visible&&!document.hidden&&!media.matches&&!frame)frame=requestAnimationFrame(update);};
    const page=()=>{node.classList.toggle('mf-page-active',!document.hidden);if(document.hidden){cancelAnimationFrame(frame);frame=0;}else schedule();};
    const motion=()=>{if(media.matches){node.classList.add('mf-seen');node.style.setProperty('--mf-depth','0px');cancelAnimationFrame(frame);frame=0;}else schedule();};
    node.classList.add('mf-motion-ready');
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;node.classList.toggle('mf-in-view',visible);if(visible){node.classList.add('mf-seen');schedule();}else{cancelAnimationFrame(frame);frame=0;}},{threshold:0});observer.observe(node);
    window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);document.addEventListener('visibilitychange',page);media.addEventListener('change',motion);page();motion();
    return ()=>{observer.disconnect();cancelAnimationFrame(frame);window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);document.removeEventListener('visibilitychange',page);media.removeEventListener('change',motion);node.classList.remove('mf-motion-ready','mf-in-view','mf-page-active');};
  },[ref]);
}

export default function MegaFooter({settings={}}){
  const config=useMemo(()=>resolveFooter(settings.footer),[settings.footer]),ref=useRef(null);useFooterMotion(ref);
  const configuredProfiles=footerProfiles(settings);
  const profiles=['github','linkedin','instagram'].map(id=>{
    const profile=configuredProfiles.find(p=>p.id===id);
    if(id==='linkedin')return {...profile,url:'https://www.linkedin.com/in/mohdsahil8687/?isSelfProfile=true'};
    if(id==='instagram')return {...profile,url:'https://www.instagram.com/sahil032__/'};
    return profile;
  });
  const hasSocials=config.showSocials&&profiles.some(p=>p.url);
  const links=config.links.filter(l=>l.visible).map(l=>navigationLinks.find(n=>n.id===l.id));
  const count=Number(config.showNavigation&&links.length>0)+1+Number(config.skills.length>0)+Number(config.status.enabled);
  return <footer className="mega-footer" ref={ref} aria-labelledby="mf-title"><div className="mf-depth-layer" aria-hidden="true"><div className="mf-ambient"/><div className="mf-blueprint"/></div><div className="wide mf-content">
    <div className="mf-closing"><div className="mf-closing-copy mf-reveal" style={{'--mf-reveal-index':0}}><p className="mf-eyebrow"><span/> {config.eyebrow}</p><h2 id="mf-title">{config.heading}<br/><em>{config.emphasis}</em></h2><p className="mf-supporting">{config.supportingText}</p><div className="mf-cta-row"><FooterLink to={config.ctaDestination} inquiry={config.ctaDestination==='/contact#inquiry-form'} className="mf-contact-cta">{config.ctaLabel}<ArrowUpRight size={18} aria-hidden="true"/></FooterLink>{config.showAvailability&&settings.availability&&<span className="mf-availability">{settings.availability}</span>}</div></div><div className="mf-art-wrap mf-reveal" style={{'--mf-reveal-index':1}}><FooterFlowVisual/></div></div>
    <div className="mf-links-grid" style={{'--mf-columns':count}}>
      {config.showNavigation&&links.length>0&&<nav className="mf-explore mf-reveal" aria-label="Footer navigation" style={{'--mf-reveal-index':2}}><h3 className="mf-column-label">EXPLORE</h3><ul>{links.map(l=><li key={l.id}><FooterLink to={l.to}><span>{l.label}</span><ArrowUpRight size={12} aria-hidden="true"/></FooterLink></li>)}</ul>{config.showReadingLink&&<FooterLink to="/reading" className="mf-reading-link">Reading archive <ArrowUpRight size={11} aria-hidden="true"/></FooterLink>}</nav>}
      <div className="mf-connect mf-reveal" style={{'--mf-reveal-index':3}}><h3 className="mf-column-label">ELSEWHERE / CONNECT</h3>{hasSocials&&<FooterSocialDock profiles={profiles}/>}<p className="mf-connect-copy">Web development. <br/>Thoughtful interfaces. <br/>Intelligent workflows.</p><Link to="/community" className="mf-community-link">Learning community <ArrowUpRight size={12} aria-hidden="true"/></Link></div>
      {config.skills.length>0&&<div className="mf-skills mf-reveal" style={{'--mf-reveal-index':4}}><h3 className="mf-column-label">WHAT I BUILD WITH</h3><p className="mf-skills-context">Hands-on tools & topics I’m exploring.</p><div className="mf-skill-nodes">{config.skills.map((skill,i)=><FooterLink to="/#skills" key={`${skill}-${i}`} aria-label={`Explore ${skill} in my Skills Journey`}><i/>{skill}</FooterLink>)}</div><FooterLink to="/#skills" className="mf-inline-link">Explore My Skills <ArrowUpRight size={13} aria-hidden="true"/></FooterLink></div>}
      {config.status.enabled&&<div className="mf-status mf-reveal" style={{'--mf-reveal-index':5}}><h3 className="mf-column-label"><span className="mf-focus-dot"/>{config.status.heading}</h3><h4>{config.status.focus}</h4><p>{config.status.description}</p>{config.status.projectLink&&<FooterLink to={config.status.projectLink} className="mf-inline-link">Related work <ArrowUpRight size={13} aria-hidden="true"/></FooterLink>}</div>}
    </div>
    <div className="mf-bottom"><div className="mf-copyright"><span>© {new Date().getFullYear()} {settings.name||'Muhammad Sahil'}</span><Link to="/admin">Admin dashboard</Link></div><span className="mf-built">Designed & Built with Intention</span><button type="button" className="mf-back-top" onClick={()=>scrollToPageTop()}>Back to Top <ArrowUp size={15} aria-hidden="true"/></button></div>
  </div></footer>;
}

const editorFields=[['eyebrow','Eyebrow'],['heading','Closing heading'],['emphasis','Italic emphasis'],['supportingText','Supporting text'],['ctaLabel','Contact CTA label'],['ctaDestination','Contact destination'],['signature','Footer signature'],['monogram','Fallback monogram']];
export function FooterEditor({settings,onSave}){
  const [draft,setDraft]=useState(()=>structuredClone(resolveFooter(settings.footer))),[socials,setSocials]=useState(()=>Object.fromEntries(footerProfiles(settings).map(p=>[p.id,p.url]))),[skills,setSkills]=useState(()=>resolveFooter(settings.footer).skills.join('\n'));
  const [availability,setAvailability]=useState(settings.availability||''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const change=(key,value)=>setDraft(d=>({...d,[key]:value}));
  const save=async e=>{e.preventDefault();setMessage('');if(!footerDestination(draft.ctaDestination)){setMessage('Use an existing destination or a valid HTTPS URL for the contact CTA.');return;}
    if(draft.status.projectLink&&!footerDestination(draft.status.projectLink)){setMessage('Use an existing destination or a valid HTTPS URL for related work.');return;}
    for(const p of footerSocials){if(socials[p.id].trim()&&!safeSocialUrl(socials[p.id])){setMessage(`Enter a valid HTTP(S) ${p.label} URL, or leave it blank to hide it.`);return;}}
    const tags=skills.split('\n').map(s=>s.trim()).filter(Boolean);if(tags.length>12||tags.some(t=>t.length>60)){setMessage('Use up to 12 short skill labels (60 characters each).');return;}
    if(draft.status.enabled&&!draft.status.focus.trim()){setMessage('Add your actual focus before enabling the focus note.');return;}
    setBusy(true);try{const footer={...draft,skills:tags,socialsConfigured:true};await onSave({footer,availability,...Object.fromEntries(Object.entries(socials).map(([id,url])=>[id,url.trim()]))});setMessage('Footer published.');}catch(err){setMessage(err.message||'Could not save the footer.');}finally{setBusy(false);}
  };
  return <><div className="admin-heading"><div className="card-eyebrow">THE FINAL IMPRESSION</div><h1>Your mega footer</h1><p>Edit the closing statement, focus and navigation. Social URLs and availability are shared with Site content; the logo is managed in Photos & logo. Only saved changes appear publicly.</p></div><form onSubmit={save}><fieldset className="mf-editor-fieldset" disabled={busy}><section className="admin-panel"><h2>Closing statement & signature</h2><div className="form-fields-grid">{editorFields.map(([key,label])=><label className={`editor-label ${key==='supportingText'?'full-field':''}`} key={key}><span>{label}</span>{key==='supportingText'?<textarea required rows={3} value={draft[key]} onChange={e=>change(key,e.target.value)}/>:<input required maxLength={key==='monogram'?4:key==='signature'?60:key==='heading'?90:200} value={draft[key]} onChange={e=>change(key,e.target.value)}/>}</label>)}<label className="editor-label full-field"><span>Availability message (shared site setting; blank hides the message)</span><input maxLength={100} value={availability} onChange={e=>setAvailability(e.target.value)}/></label></div><label className="mf-editor-check"><input type="checkbox" checked={draft.showAvailability} onChange={e=>change('showAvailability',e.target.checked)}/>Show configured availability in the footer</label></section>
    <section className="admin-panel"><h2>Social connections</h2><label className="mf-editor-check"><input type="checkbox" checked={draft.showSocials} onChange={e=>change('showSocials',e.target.checked)}/>Show configured social links</label><div className="form-fields-grid">{footerSocials.map(p=><label className="editor-label" key={p.id}><span>{p.label} URL (blank hides the public icon)</span><input type="url" value={socials[p.id]} onChange={e=>setSocials(s=>({...s,[p.id]:e.target.value}))}/></label>)}</div><div className="mf-admin-social-preview" aria-label="Configured social preview">{footerSocials.map(p=>{const Icon=socialIcons[p.id];return <span key={p.id} className={safeSocialUrl(socials[p.id])?'mf-configured':''}><Icon size={16} aria-hidden="true"/>{p.label}<small>{safeSocialUrl(socials[p.id])?'Configured':'Hidden publicly'}</small></span>;})}</div></section>
    <section className="admin-panel"><h2>Footer navigation</h2><label className="mf-editor-check"><input type="checkbox" checked={draft.showNavigation} onChange={e=>change('showNavigation',e.target.checked)}/>Show Explore navigation</label><div className="mf-editor-links">{draft.links.map(l=><label key={l.id}><input type="checkbox" checked={l.visible} onChange={e=>change('links',draft.links.map(n=>n.id===l.id?{...n,visible:e.target.checked}:n))}/>{navigationLinks.find(n=>n.id===l.id).label}</label>)}</div><label className="mf-editor-check"><input type="checkbox" checked={draft.showReadingLink} onChange={e=>change('showReadingLink',e.target.checked)}/>Include the Reading archive link</label></section>
    <section className="admin-panel"><h2>Skills mini-preview</h2><label className="editor-label"><span>Up to 12 labels, one per line. Leave empty to hide this area.</span><textarea rows={6} value={skills} onChange={e=>setSkills(e.target.value)}/></label></section>
    <section className="admin-panel"><h2>Professional focus</h2><p className="mf-editor-note">This describes your learning/building direction; it does not indicate real-time online presence.</p><label className="mf-editor-check"><input type="checkbox" checked={draft.status.enabled} onChange={e=>change('status',{...draft.status,enabled:e.target.checked})}/>Show the focus note</label><div className="form-fields-grid">{[['heading','Status heading'],['focus','Current focus'],['description','Supporting description'],['projectLink','Optional related project URL']].map(([key,label])=><label className="editor-label" key={key}><span>{label}</span>{key==='description'?<textarea rows={3} value={draft.status[key]} onChange={e=>change('status',{...draft.status,[key]:e.target.value})}/>:<input maxLength={200} value={draft.status[key]} onChange={e=>change('status',{...draft.status,[key]:e.target.value})}/>}</label>)}</div></section><button type="submit" className="btn btn-primary"><Check size={16}/>{busy?'Saving…':'Save & publish'}</button></fieldset><p className="form-message" role="status">{message}</p></form></>;
}
