import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {ArrowLeft,ArrowRight,ArrowUpRight,BookOpen,Check,Pause,Play} from 'lucide-react';
import {bookOffset,coverSource,defaultBooks,jacketThemes,publicBooks,wrapIndex,safeBookLink} from './books-data';
import './reading.css';

const modes=[{id:'read',label:"Books I’ve read",intro:'Eight books. Different perspectives. One continuous learning journey.'},{id:'practice',label:'Learnings in progress',intro:'Reading gives me new perspectives. Putting those ideas into practice is the real challenge.'},{id:'reflect',label:'What I think',intro:'Not every idea from a book becomes a rule. Some ideas make me think differently, some challenge my assumptions, and some are worth testing in real life.'}];
export function BookJacket({book,load=true}){
  const source=coverSource(book),[failed,setFailed]=useState(''),[loaded,setLoaded]=useState(''),[requested,setRequested]=useState(load);
  useEffect(()=>{if(load)setRequested(true);},[load]);
  return <span className={`ra-jacket ra-theme-${jacketThemes.includes(book.theme)?book.theme:'ivory'}`}>
    <span className="ra-book-pages"/><span className="ra-book-spine"/>
    <span className="ra-book-front"><span className="ra-cover-design" aria-hidden="true"><span className="ra-cover-edition">THE READING ARCHIVE</span><strong>{book.title}</strong><span className="ra-cover-art"><i/><i/><i/></span><span className="ra-cover-author">{book.author}</span><small>IDEAS / PERSPECTIVES / POSSIBILITY</small></span>
    {(load||requested)&&source&&failed!==source&&<img src={source} alt={`Cover of ${book.title} by ${book.author}`} width="240" height="360" loading="lazy" decoding="async" referrerPolicy="no-referrer" className={loaded===source?'ra-cover-loaded':''} onError={()=>setFailed(source)} onLoad={e=>{if(e.currentTarget.naturalWidth<5)setFailed(source);else setLoaded(source);}}/>}<span className="ra-cover-light"/></span>
  </span>;
}

export function BookGallery({books,selectedId,onSelect,onOpenNotes,playing,setPlaying}){
  const selected=Math.max(0,books.findIndex(b=>b.id===selectedId));
  const [inView,setInView]=useState(false),[pageVisible,setPageVisible]=useState(true),[reduced,setReduced]=useState(false);
  const region=useRef(null),buttons=useRef([]),current=useRef(selected),lock=useRef(false),lockTimer=useRef(0),hoverTimer=useRef(0),candidate=useRef(null),anchor=useRef(null),armed=useRef(true),keyboard=useRef(true),touch=useRef(null),lastSwipe=useRef(0);
  current.current=selected;
  const select=(index,source='manual',point=null)=>{
    const next=wrapIndex(index,books.length);if(next===current.current||!books.length||(source==='hover'&&lock.current))return;
    clearTimeout(hoverTimer.current);candidate.current=null;clearTimeout(lockTimer.current);
    onSelect(books[next].id);if(source!=='auto')setPlaying(false);
    anchor.current=point;armed.current=false;lock.current=true;
    lockTimer.current=window.setTimeout(()=>{lock.current=false;},reduced?0:780);
  };
  useEffect(()=>{
    const observer=new IntersectionObserver(([entry])=>setInView(entry.isIntersecting),{threshold:.2});observer.observe(region.current);
    const visibility=()=>setPageVisible(!document.hidden);document.addEventListener('visibilitychange',visibility);visibility();
    const media=matchMedia('(prefers-reduced-motion:reduce)');const motion=()=>{setReduced(media.matches);if(media.matches)setPlaying(false);};media.addEventListener('change',motion);motion();
    return ()=>{observer.disconnect();document.removeEventListener('visibilitychange',visibility);media.removeEventListener('change',motion);clearTimeout(lockTimer.current);clearTimeout(hoverTimer.current);};
  },[]);
  useEffect(()=>{
    if(!playing||!inView||!pageVisible||reduced||books.length<2)return;
    const timer=window.setInterval(()=>select(current.current+1,'auto'),6500);return ()=>clearInterval(timer);
  },[playing,inView,pageVisible,reduced,books]);
  useEffect(()=>{clearTimeout(hoverTimer.current);clearTimeout(lockTimer.current);lock.current=false;candidate.current=null;armed.current=true;},[books]);
  const hover=(index,event)=>{
    if(event.pointerType!=='mouse'||!matchMedia('(hover:hover)').matches||lock.current||index===current.current)return;
    if(!armed.current){if(anchor.current&&Math.hypot(event.clientX-anchor.current.x,event.clientY-anchor.current.y)>24)armed.current=true;else return;}
    if(candidate.current===index)return;
    clearTimeout(hoverTimer.current);candidate.current=index;const point={x:event.clientX,y:event.clientY};
    hoverTimer.current=window.setTimeout(()=>{if(Math.abs(bookOffset(index,current.current,books.length))===1)select(index,'hover',point);},160);
  };
  return <div className="ra-gallery" ref={region} role="region" aria-roledescription="carousel" aria-label="Reading collection" aria-describedby="ra-gallery-instructions" onPointerEnter={e=>{if(!e.target.closest('.ra-play'))setPlaying(false);}} onKeyDownCapture={()=>{keyboard.current=true;}} onPointerDownCapture={e=>{keyboard.current=false;if(!e.target.closest('.ra-play'))setPlaying(false);}} onFocusCapture={e=>{if(!e.target.closest('.ra-play'))setPlaying(false);}} onKeyDown={e=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();
    const next=wrapIndex(e.key==='Home'?0:e.key==='End'?books.length-1:current.current+(e.key==='ArrowLeft'?-1:1),books.length);select(next);requestAnimationFrame(()=>buttons.current[next]?.focus({preventScroll:true}));
  }}>
    <div className="ra-gallery-controls">{!reduced&&books.length>1&&<button type="button" className="ra-play" onClick={()=>setPlaying(p=>!p)} aria-label={playing?'Pause automatic rotation':'Start automatic rotation'}>{playing?<Pause size={13}/>:<Play size={13}/>}</button>}<div className="ra-book-count" aria-live={playing?'off':'polite'} aria-atomic="true"><strong>{String(selected+1).padStart(2,'0')}</strong><span>/ {String(books.length).padStart(2,'0')}</span><span className="sr-only">{books[selected]?.title} by {books[selected]?.author}</span></div><div className="ra-book-dots" role="group" aria-label="Select a book">{books.map((b,i)=><button key={b.id} type="button" className={i===selected?'ra-dot-active':''} aria-label={`Select ${b.title}`} aria-pressed={i===selected} onClick={()=>select(i)}><i/></button>)}</div><div className="ra-arrows"><button type="button" onClick={()=>select(current.current-1)} aria-label="Previous book"><ArrowLeft size={17}/></button><button type="button" onClick={()=>select(current.current+1)} aria-label="Next book"><ArrowRight size={17}/></button></div></div>
    <p id="ra-gallery-instructions" className="sr-only">Select a neighboring book, use the previous and next buttons, or press Left and Right arrow keys. On touchscreens, swipe horizontally. Activate the selected book to read its notes.</p>
    <div className="ra-stage-label"><span>THE PERSONAL COLLECTION</span><span>READ / REFLECT / REVISIT</span></div>
    <div className="ra-book-scene" onPointerEnter={()=>setPlaying(false)} onPointerMove={e=>{const node=e.target.closest('[data-book-index]');if(node)hover(Number(node.dataset.bookIndex),e);}} onPointerLeave={()=>{clearTimeout(hoverTimer.current);candidate.current=null;armed.current=true;}} onTouchStart={e=>{if(e.touches.length===1){touch.current={x:e.touches[0].clientX,y:e.touches[0].clientY};setPlaying(false);}}} onTouchEnd={e=>{if(!touch.current)return;const dx=e.changedTouches[0].clientX-touch.current.x,dy=e.changedTouches[0].clientY-touch.current.y;touch.current=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.4){lastSwipe.current=Date.now();select(current.current+(dx<0?1:-1));}}} onTouchCancel={()=>{touch.current=null;}}>
      <div className="ra-stage-light" aria-hidden="true"/><div className="ra-stage-floor" aria-hidden="true"/>
      {books.map((b,i)=>{const offset=bookOffset(i,selected,books.length),visible=Math.abs(offset)<=1;return <button type="button" key={b.id} ref={el=>{buttons.current[i]=el;}} data-book-index={i} className={`ra-book-slot ${offset===0?'ra-book-selected':offset===-1?'ra-book-previous':offset===1?'ra-book-next':offset<0?'ra-book-away-left':'ra-book-away-right'}`} tabIndex={visible?0:-1} aria-hidden={!visible} inert={!visible} aria-label={`${b.title} by ${b.author}. ${offset===0?'Selected. Read notes.':'Select book.'}`} aria-pressed={offset===0} onPointerEnter={e=>hover(i,e)} onPointerLeave={()=>{if(candidate.current===i){clearTimeout(hoverTimer.current);candidate.current=null;}}} onFocus={()=>{if(keyboard.current&&visible)select(i);}} onClick={()=>{if(Date.now()-lastSwipe.current<500)return;if(i===current.current){setPlaying(false);onOpenNotes(b);}else select(i);}}><BookJacket book={b} load={visible}/><span className="ra-book-tooltip" aria-hidden="true">Explore my notes <ArrowUpRight size={12}/></span></button>;})}
    </div>
  </div>;
}

function SelectedBook({book,index,total,mode}){
  return <div className="ra-selected-info" key={`${book.id}-${mode}`}><div><p className="ra-info-meta">BOOK {String(index+1).padStart(2,'0')} / {String(total).padStart(2,'0')} <span><Check size={10}/>{book.reading_status}</span></p><h3>{book.title}</h3><p className="ra-info-author">{book.author} <span> / </span> {book.category}</p></div><div className="ra-info-note"><span className="ra-small-label">{mode==='practice'?'AN IDEA TO TEST':mode==='reflect'?'A SPACE FOR REFLECTION':'EDITORIAL LEARNING FOCUS'}</span><p>{mode==='practice'?(book.practical_applications[0]||book.focus):mode==='reflect'?(book.personal_reflection||'Personal reflections haven’t been added yet. Open the notes for ideas and questions to consider.'):book.focus}</p><Link to={`/reading/${book.slug}`}>Read My Notes <ArrowUpRight size={15}/></Link></div></div>;
}

export default function ReadingArchive({books=defaultBooks}){
  const list=useMemo(()=>publicBooks(books),[books]);
  const [selectedId,setSelectedId]=useState(list[0]?.id),[mode,setMode]=useState('read'),[playing,setPlaying]=useState(false);
  const galleryBooks=useMemo(()=>mode==='read'?list.filter(b=>b.reading_status==='Read'):list,[list,mode]);
  const tabRefs=useRef([]);const navigate=useNavigate();
  const readCount=list.filter(b=>b.reading_status==='Read').length;
  const selection=galleryBooks.find(b=>b.id===selectedId)||galleryBooks[0];
  return <section className="reading-archive" id="reading-archive" aria-labelledby="reading-title"><div className="wide">
    <div className="ra-heading-row"><p className="ra-eyebrow"><span/> THE READING ARCHIVE</p><Link className="ra-resource-link" to="/resources">Browse Free Resources <ArrowUpRight size={13}/></Link></div>
    <div className="ra-layout"><div className="ra-intro"><h1 id="reading-title">Read.<br/><em>Reflect.</em><br/>Build.</h1><p className="ra-lead">Books that shaped my curiosity, challenged how I think, and continue influencing the way I learn, build, and create.</p>
      <div className="ra-tabs" role="tablist" aria-label="Reading perspectives" aria-orientation="vertical" onKeyDown={e=>{if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;e.preventDefault();const i=modes.findIndex(m=>m.id===mode);const next=e.key==='Home'?0:e.key==='End'?2:wrapIndex(i+(e.key==='ArrowUp'?-1:1),3);setMode(modes[next].id);setPlaying(false);tabRefs.current[next]?.focus();}}>{modes.map((m,i)=><button key={m.id} ref={el=>{tabRefs.current[i]=el;}} id={`ra-tab-${m.id}`} role="tab" aria-selected={mode===m.id} aria-controls="ra-perspective" tabIndex={mode===m.id?0:-1} onClick={()=>{setMode(m.id);setPlaying(false);}}><span>0{i+1}</span>{m.label}<ArrowUpRight size={14}/></button>)}</div>
      <div id="ra-perspective" className="ra-perspective" role="tabpanel" tabIndex="0" aria-labelledby={`ra-tab-${mode}`}><div key={mode}><span className="ra-small-label">{mode==='read'?`${String(readCount).padStart(2,'0')} Books Explored`:mode==='practice'?'FROM IDEAS TO EVERYDAY PRACTICE':'A PERSONAL POINT OF VIEW'}</span><p>{mode==='read'?(list.length===8?'Eight books. Different perspectives. One continuous learning journey.':`${list.length} books. Different perspectives. One continuous learning journey.`):modes.find(m=>m.id===mode).intro}</p>{mode==='practice'&&<div className="ra-practice-topics"><span>Habits</span><span>Focus</span><span>Time</span><span>Decisions</span><span>Creativity</span><span>Consistency</span></div>}</div></div>
    </div><div className="ra-display">{selection?<><BookGallery books={galleryBooks} selectedId={selection.id} onSelect={setSelectedId} onOpenNotes={b=>navigate(`/reading/${b.slug}`)} playing={playing} setPlaying={setPlaying}/><div className="ra-book-details" aria-live={playing?'off':'polite'} aria-atomic="true" onPointerEnter={()=>setPlaying(false)} onFocusCapture={()=>setPlaying(false)}><SelectedBook book={selection} index={galleryBooks.indexOf(selection)} total={galleryBooks.length} mode={mode}/></div></>:<div className="ra-empty"><BookOpen size={34}/><h3>The next chapter is taking shape.</h3><p>{list.length?'Choose another perspective to explore ongoing reading.':'Published reading notes will appear here.'}</p></div>}</div></div>
  </div></section>;
}

export function BookNotes({book,books=defaultBooks,loading=false}){
  if(loading)return <section className="reading-notes wide"><p role="status">Opening the reading desk…</p></section>;
  if(!book)return <section className="reading-notes wide"><Link to="/reading" className="ra-back"><ArrowLeft size={15}/>Back to reading archive</Link><h1>Notes not found.</h1><p>This book may be unpublished or its link may have changed.</p></section>;
  const related=publicBooks(books).filter(b=>b.id!==book.id).slice(0,3);
  return <article className="reading-notes wide"><Link to="/reading" className="ra-back"><ArrowLeft size={15}/>Back to reading archive</Link><header className="rn-header"><div><p className="ra-eyebrow">THE READING ARCHIVE / OPEN NOTES</p><span className="rn-status">{book.reading_status} <span> / </span> {book.category}</span><h1>{book.title}</h1><p className="rn-author">By {book.author}</p><p className="rn-introduction">{book.description}</p></div><div className="rn-cover"><BookJacket book={book}/>{!book.cover_image_url&&book.isbn&&<a href={`https://openlibrary.org/isbn/${book.isbn}`} target="_blank" rel="noopener noreferrer">Cover via Open Library <ArrowUpRight size={11}/></a>}</div></header>
    <div className="rn-reading-layout"><aside><p className="ra-small-label">IN THESE NOTES</p><a href="#key-ideas">01 / Key ideas</a><a href="#personal-reflection">02 / My reflections</a><a href="#applications">03 / Practical applications</a><a href="#related-learning">04 / Related interests</a></aside><div className="rn-body"><p className="rn-editorial-label">Editorial starting points are provided below. Personal reflections are written separately by Sahil.</p><section id="key-ideas"><span className="ra-small-label">01 / IDEAS TO CONSIDER</span><h2>Key ideas</h2><ul>{book.key_ideas.map((idea,i)=><li key={i}>{idea}</li>)}</ul></section><section id="personal-reflection"><span className="ra-small-label">02 / THE PERSONAL MARGIN</span><h2>My reflections</h2>{book.personal_reflection?<p className="rn-reflection">{book.personal_reflection}</p>:<div className="rn-unwritten"><BookOpen size={20}/><h3>A little room to think.</h3><p>Personal reflections haven’t been added for this book yet. The ideas and questions on this page are editorial starting points, ready to revisit and personalize.</p></div>}</section><section id="applications"><span className="ra-small-label">03 / FROM READING TO PRACTICE</span><h2>Practical applications</h2><p>Questions to explore, rather than claims of completed results.</p><ol>{book.practical_applications.map((idea,i)=><li key={i}>{idea}</li>)}</ol></section><section id="related-learning"><span className="ra-small-label">04 / CONNECTING THE DOTS</span><h2>Related learning interests</h2><div className="rn-interests">{book.related_interests.map((t,i)=><span key={i}>{t}</span>)}</div>{book.related_resources.length>0&&<div className="rn-resources"><h3>Related resources</h3>{book.related_resources.map((r,i)=>{const href=safeBookLink(r.url);return href.startsWith('/')?<Link key={i} to={href}>{r.label}<ArrowUpRight size={13}/></Link>:<a key={i} href={href} target="_blank" rel="noopener noreferrer">{r.label}<ArrowUpRight size={13}/></a>;})}</div>}</section><div className="rn-footer"><p>More original guides, templates and practical notes.</p><Link to="/resources">Browse Free Resources <ArrowUpRight size={15}/></Link></div></div></div>
    <section className="rn-more"><h2>Another perspective.</h2>{related.map(b=><Link key={b.id} to={`/reading/${b.slug}`}><span>{b.title}<small>{b.author}</small></span><ArrowUpRight size={17}/></Link>)}</section>
  </article>;
}
