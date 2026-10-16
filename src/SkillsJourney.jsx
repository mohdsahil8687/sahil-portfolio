import React, {useEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowDown, ArrowUpRight, Keyboard, Gamepad2, Code2, Server, Database, Brain, ChartNoAxesCombined, Network, Orbit, Github, GitBranch, Layers, Braces, FileCode2, X, Plus, ArrowUp, Trash2} from 'lucide-react';
import {defaultSkills, resolveSkills, validSkills, STATUSES, ICONS} from './skills-data';
import './skills.css';

const symbols = {keyboard:Keyboard,game:Gamepad2,web:Code2,server:Server,database:Database,brain:Brain,chart:ChartNoAxesCombined,network:Network,orbit:Orbit};
const techSymbols = {React:Orbit,GitHub:Github,Git:GitBranch,Supabase:Layers,PostgreSQL:Database,'MongoDB (exploring)':Database,JavaScript:Braces,HTML5:FileCode2,CSS3:FileCode2,'Node.js':Server,'Express.js':Server,Python:Code2,Vite:Layers};
function Tags({items}) {return <div className="sj-tags">{items.map((t,i)=>{const Icon=techSymbols[t];return <span key={`${t}-${i}`} style={{'--tag-index':Math.min(i,8)}}>{Icon&&<Icon size={13} aria-hidden="true"/>}{t}</span>;})}</div>;}

export default function SkillsJourney({skills}) {
  const stages=resolveSkills(skills);
  const [selected,setSelected]=useState(stages[0].id);
  const [expanded,setExpanded]=useState(true);
  const [shape,setShape]=useState({d:'',width:1,height:1});
  const scene=useRef(null), path=useRef(null), light=useRef(null), packet=useRef(null);
  const active=stages.find(s=>s.id===selected)||stages[0];
  useEffect(()=>{
    const el=scene.current;
    let frame=0, visible=false, points=[];
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const update=()=>{
      frame=0;
      if(!visible || !path.current || !points.length)return;
      const rect=el.getBoundingClientRect();
      const y=Math.max(0,Math.min(rect.height,window.innerHeight*.56-rect.top));
      const length=path.current.getTotalLength();
      let low=0,high=length;
      for(let i=0;i<16;i++){const mid=(low+high)/2;if(path.current.getPointAtLength(mid).y<y)low=mid;else high=mid;}
      const traveled=media.matches?length:(low+high)/2;
      light.current.style.strokeDasharray=`${length} ${length}`;
      light.current.style.strokeDashoffset=String(length-traveled);
      const p=path.current.getPointAtLength(traveled);
      packet.current.setAttribute('cx',p.x);packet.current.setAttribute('cy',p.y);
      const nodes=el.querySelectorAll('.sj-stage');
      nodes.forEach((node,i)=>node.classList.toggle('sj-reached',media.matches||points[i].y<=y+8));
      // Keyboard selection remains stable until the visitor scrolls again.
      if(!el.contains(document.activeElement)){
        let index=0;points.forEach((p,i)=>{if(p.y<=y+8)index=i;});
        setSelected(stages[index].id);
      }
    };
    const schedule=()=>{if(!frame && visible)frame=requestAnimationFrame(update);};
    const measure=()=>{
      const rect=el.getBoundingClientRect();
      points=Array.from(el.querySelectorAll('.sj-node')).map(n=>{const b=n.getBoundingClientRect();return {x:b.left-rect.left+b.width/2,y:b.top-rect.top+b.height/2};});
      const d=points.map((p,i)=>i?`C ${points[i-1].x} ${points[i-1].y+(p.y-points[i-1].y)*.62}, ${p.x} ${p.y-(p.y-points[i-1].y)*.62}, ${p.x} ${p.y}`:`M ${p.x} ${p.y}`).join(' ');
      setShape({d,width:rect.width,height:rect.height});schedule();
    };
    const resize=new ResizeObserver(measure);resize.observe(el);
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;el.classList.toggle('sj-in-view',visible);schedule();},{rootMargin:'80px'});observer.observe(el);
    window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',measure);
    media.addEventListener('change',schedule);measure();
    return ()=>{cancelAnimationFrame(frame);resize.disconnect();observer.disconnect();window.removeEventListener('scroll',schedule);window.removeEventListener('resize',measure);media.removeEventListener('change',schedule);};
  },[stages]);
  return <section id="skills" className="skills-journey" aria-labelledby="skills-title">
    <div className="wide">
      <div className="sj-intro"><div><p className="sj-eyebrow"><span/> THE SKILLS JOURNEY <b> / 03</b></p><h2 id="skills-title">From curiosity<br/>to <em>creation.</em></h2></div><div className="sj-intro-copy"><span className="sj-coordinate">AN EVOLVING MAP / WEB + INTELLIGENCE</span><p>Exploring technology, building real projects, and continuously expanding my skills across development, AI and automation.</p><span className="sj-scroll"><ArrowDown size={14}/> Follow the path. Select a stage.</span></div></div>
      <div className="sj-legend" aria-label="Learning status legend">{STATUSES.map((s,i)=><span key={s}><i className={`sj-status-dot sj-dot-${i}`}/>{s}</span>)}<small>LEARN / BUILD / CONNECT</small></div>
      <div className="sj-experience">
        <div className="sj-scene" ref={scene}>
          <div className="sj-grid-plane" aria-hidden="true"/>
          <svg className="sj-path" viewBox={`0 0 ${shape.width} ${shape.height}`} aria-hidden="true"><path ref={path} d={shape.d} className="sj-path-track"/><path ref={light} d={shape.d} className="sj-path-light"/><circle ref={packet} r="4" className="sj-packet"/></svg>
          <ol className="sj-stages">{stages.map((s,i)=>{const Icon=symbols[s.icon];return <li key={s.id} className={`sj-stage ${s.id===active.id?'sj-selected':''} ${s.status==='UP NEXT'?'sj-future':''} ${s.id==='machine-learning'?'sj-current':''}`}>
            <button className="sj-node" aria-label={`${String(i+1).padStart(2,'0')}. ${s.category}: ${s.status}. Show details`} aria-pressed={s.id===active.id} aria-controls="skill-detail" onFocus={()=>{setSelected(s.id);setExpanded(true);}} onClick={()=>{setSelected(s.id);setExpanded(true);}}><Icon size={24} aria-hidden="true"/><span>{String(i+1).padStart(2,'0')}</span></button>
            <div className="sj-stage-copy"><span className="sj-category">{s.category}</span><h3>{s.title}</h3><span className="sj-status">{s.status==='IN PROGRESS'&&<i/>}{s.status}</span><p>{s.description}</p><Tags items={s.technologies.slice(0,3)}/>{s.id==='foundations'&&<small className="sj-milestone">TARGET / 100+ WPM</small>}{s.id==='backend'&&<div className="sj-architecture" aria-label="Frontend to API to backend"><span>UI</span><i/><span>API</span><i/><span>LOGIC</span></div>}<details className="sj-mobile-details"><summary>All tools & context</summary><Tags items={s.technologies}/><p className="sj-note">{s.note}</p></details></div>
          </li>;})}</ol>
          <span className="sj-endpoint">THE PATH CONTINUES <ArrowDown size={13}/></span>
        </div>
        <aside className="sj-detail" id="skill-detail" aria-label="Selected skill details"><div className="sj-detail-top"><span>FIELD NOTES / {String(stages.indexOf(active)+1).padStart(2,'0')}</span><button aria-label={expanded?'Collapse skill details':'Expand skill details'} aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?<X size={16}/>:<Plus size={16}/>}</button></div><div className={`sj-detail-body ${expanded?'sj-detail-open':''}`}><div className="sj-detail-inner" key={active.id}><span className="sj-status">{active.status}</span><p className="sj-category">{active.category}</p><h3>{active.title}</h3><p>{active.description}</p><span className="sj-detail-label">TOOLS & TOPICS</span><Tags items={active.technologies}/><p className="sj-note">{active.note}</p></div></div><div className="sj-detail-foot"><span className="sj-tiny-orbit"/> Knowledge becomes useful<br/>when you build with it.</div></aside>
      </div>
      <div className="sj-outro"><div><p className="sj-eyebrow">THE NEXT CHAPTER IS IN THE MAKING</p><h3>Still building. <em>Still learning.</em></h3><p>The roadmap keeps evolving as I turn knowledge into practical projects.</p></div><Link to="/work#projects" className="text-link">Explore My Projects <ArrowUpRight size={19}/></Link></div>
    </div>
  </section>;
}

export function SkillsEditor({settings,onSave}) {
  const [draft,setDraft]=useState(()=>structuredClone(resolveSkills(settings.skillsJourney)));
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const change=(i,key,value)=>setDraft(old=>old.map((s,j)=>i===j?{...s,[key]:value}:s));
  const move=(i,delta)=>setDraft(old=>{const next=[...old];[next[i],next[i+delta]]=[next[i+delta],next[i]];return next;});
  const save=async e=>{e.preventDefault();setMessage('');const cleaned=draft.map(s=>({...s,technologies:s.technologies.map(t=>t.trim()).filter(Boolean)}));if(!validSkills(cleaned)){setMessage('Use at least one complete stage, with a title, category, and valid status.');return;}setBusy(true);try{await onSave(cleaned);setDraft(cleaned);setMessage('Skills journey published.');}catch(e){setMessage(e.message||'Unable to save skills.');}finally{setBusy(false);}};
  return <><div className="admin-heading"><div className="card-eyebrow">SKILLS CONTENT EDITOR</div><h1>The skills journey</h1><p>Edit stages, categories, tools and future milestones. Order here controls the public pathway. Changes publish only after saving.</p></div><form onSubmit={save}><fieldset className="sj-editor-fieldset" disabled={busy}>{draft.map((s,i)=><div className="admin-panel" key={s.id}><div className="admin-panel-head"><h2>{String(i+1).padStart(2,'0')} / {s.title}</h2><div className="sj-editor-actions"><button type="button" aria-label={`Move ${s.title} up`} disabled={i===0} onClick={()=>move(i,-1)}><ArrowUp size={17}/></button><button type="button" aria-label={`Move ${s.title} down`} disabled={i===draft.length-1} onClick={()=>move(i,1)}><ArrowDown size={17}/></button><button type="button" aria-label={`Remove ${s.title}`} disabled={draft.length===1} onClick={()=>setDraft(old=>old.filter((_,j)=>j!==i))}><Trash2 size={17}/></button></div></div><div className="form-fields-grid">{[['title','Title'],['category','Category'],['description','Description'],['note','Context / future milestone']].map(([key,label])=><label className="editor-label" key={key}><span>{label}</span>{key==='description'||key==='note'?<textarea value={s[key]} onChange={e=>change(i,key,e.target.value)} rows={3}/>:<input required value={s[key]} onChange={e=>change(i,key,e.target.value)}/>}</label>)}<label className="editor-label"><span>Status</span><select value={s.status} onChange={e=>change(i,'status',e.target.value)}>{STATUSES.map(v=><option key={v}>{v}</option>)}</select></label><label className="editor-label"><span>Stage symbol</span><select value={s.icon} onChange={e=>change(i,'icon',e.target.value)}>{ICONS.map(v=><option key={v}>{v}</option>)}</select></label><label className="editor-label full-field"><span>Technologies (one per line; known technologies show matching Lucide symbols)</span><textarea rows={4} value={s.technologies.join('\n')} onChange={e=>change(i,'technologies',e.target.value.split('\n'))}/></label></div></div>)}<div className="sj-editor-actions"><button type="button" className="btn btn-secondary" disabled={draft.length>=50} onClick={()=>setDraft(old=>[...old,{id:crypto.randomUUID(),category:'New category',title:'A new chapter',description:'',status:'UP NEXT',icon:'orbit',technologies:[],note:''}])}><Plus size={16}/>Add stage</button><button className="btn btn-primary" type="submit">{busy?'Saving…':'Save & publish'}</button><button type="button" className="btn btn-secondary" onClick={()=>setDraft(structuredClone(defaultSkills))}>Load curated defaults</button></div></fieldset><p role="status" className="form-message">{message}</p></form></>;
}
