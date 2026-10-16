import React, { useState } from 'react';
import { Eye, Pencil, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { db, safeUrl } from '../backend/client';
import { Field, Heading, Notice, result, useQuery } from './ui';
import { uploadAsset } from './media';

const schemas = {
  projects: { title: 'Projects Manager', fields: [['title','Title','text',true],['category','Category'],['description','Short description','textarea'],['detailed_description','Detailed description','textarea'],['tech','Technology stack (separate with ·)'],['image_url','Cover image','image'],['video_url','Demo video URL','url'],['repo_url','GitHub repository URL','url'],['url','Live website URL','url'],['status','Project status'],['featured','Featured','checkbox'],['seo_title','SEO title'],['seo_description','SEO description','textarea'],['archived','Archived','checkbox']] },
  skills: { title: 'Skills Manager', fields: [['title','Title','text',true],['category','Category','text',true],['description','Description','textarea'],['note','Context / learning milestone','textarea'],['status','Learning status',['FOUNDATION','HANDS-ON','IN PROGRESS','UP NEXT']],['icon','Journey symbol',['keyboard','game','web','server','database','brain','chart','network','orbit']],['icon_url','Uploaded icon','image'],['technologies','Technology labels (one per line)','lines'],['proficiency','Proficiency / learning context'],['currently_learning','Currently learning','checkbox']] },
  resources: { title: 'Resources Manager', fields: [['title','Title','text',true],['slug','Existing route slug','text',true],['description','Description','textarea'],['category','Category'],['thumbnail_url','Thumbnail','image'],['tags','Tags (one per line)','lines'],['access_type','Access',['free','members']],['file_url','PDF or external HTTPS URL','resource']] },
  social_links: { title: 'Social Links', fields: [['platform','Platform (instagram, github, linkedin, youtube, facebook or custom)','text',true],['label','Accessible label','text',true],['url','HTTPS URL','url',true],['icon','Icon',['instagram','github','linkedin','youtube','facebook','globe']],['enabled','Enabled','checkbox'],['new_tab','Open new tab','checkbox']] },
};
const empty = table => ({ id: crypto.randomUUID(), title: '', category: '', description: '', position: 99, published: false, ...(table === 'projects' ? { status: 'IN PROGRESS', featured: false, archived: false } : table === 'skills' ? { technologies: [], status: 'UP NEXT', icon: 'orbit', note: '' } : table === 'resources' ? { slug: '', tags: [], access_type: 'free', file_url: '', file_path: '' } : { platform: '', label: '', url: '', icon: 'globe', enabled: true, new_tab: true }) });

export default function ContentManager({ table, onRefresh }) {
  const schema = schemas[table], [page, setPage] = useState(0), [search, setSearch] = useState(''), [filter, setFilter] = useState('all');
  const [draft, setDraft] = useState(null), [screenshots, setScreenshots] = useState(''), [privatePath, setPrivatePath] = useState(null), [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [failure, setFailure] = useState(false);
  const list = useQuery(async () => {
    let query = db.from(table).select('*', { count: 'exact' }).order('position').order('id').range(page * 50, page * 50 + 49);
    if (search.trim()) query = query.ilike(table === 'social_links' ? 'label' : 'title', '%' + search.replace(/[%_]/g, '') + '%');
    if (filter !== 'all') query = query.eq(table === 'social_links' ? 'enabled' : 'published', filter === 'published');
    const response = await query; result(response); return { rows: response.data, count: response.count };
  }, [table, page, search, filter]);
  const change = (key, value) => setDraft(d => ({ ...d, [key]: value }));
  const run = async operation => { setBusy(true); setNotice(''); setFailure(false); try { await operation(); } catch (error) { setFailure(true); setNotice(error.message); } finally { setBusy(false); } };
  const refresh = async () => { await list.refresh(); await onRefresh(); };
  const open = row => run(async () => {
    const next = structuredClone(row || empty(table)); setDraft(next); setPrivatePath(null); setScreenshots('');
    if (row && table === 'projects') setScreenshots(result(await db.from('project_media').select('url').eq('project_id', row.id).order('position')).map(m => m.url).join('\n'));
    if (row && table === 'resources' && row.access_type === 'members') setPrivatePath(result(await db.from('resource_files').select('path').eq('resource_id', row.id).maybeSingle())?.path || null);
  });
  const save = event => { event.preventDefault(); run(async () => {
    const columns = [...schema.fields.map(f => f[0]), 'position', ...(table === 'social_links' ? [] : ['published'])];
    const payload = Object.fromEntries(columns.map(key => [key, draft[key] ?? (['featured','archived','currently_learning'].includes(key) ? false : ['technologies','tags'].includes(key) ? [] : '')]));
    payload.id = draft.id;
    if (!Number.isInteger(payload.position)) throw new Error('Sort order must be a whole number.');
    for (const [key,,type] of schema.fields) {
      if (['url','image','resource'].includes(type) && payload[key] && !safeUrl(payload[key])) throw new Error(key + ' needs a valid HTTPS URL without embedded credentials.');
    }
    if (table === 'resources') {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(payload.slug)) throw new Error('Use a lowercase, hyphenated route slug.');
      payload.file_path = draft.file_path || '';
      result(await db.rpc('save_resource', { p_resource: payload, p_private_path: privatePath }));
    } else if (table === 'projects') {
      const urls = screenshots.split('\n').map(s => s.trim()).filter(Boolean);
      if (urls.length > 30 || urls.some(url => !safeUrl(url))) throw new Error('Use up to 30 HTTPS screenshot URLs.');
      result(await db.rpc('save_project', { p_project: payload, p_media: urls }));
    } else result(await db.from(table).upsert(payload).select('id').single());
    setDraft(null); await refresh(); setNotice('Saved. Published content is available on the existing public pages.');
  }); };
  const upload = (field, type, file) => { if (!file) return; run(async () => {
    const bucket = type === 'resource' ? draft.access_type === 'members' ? 'portfolio-private' : 'portfolio-pdfs' : 'portfolio-media';
    const asset = await uploadAsset(file, bucket);
    if (type === 'resource' && draft.access_type === 'members') { setPrivatePath(asset.path); change('file_url', ''); change('file_path', ''); }
    else { change(field, asset.url); if (type === 'resource') change('file_path', asset.path); }
    setNotice('Uploaded. Save the record to attach this file.');
  }); };
  const mutate = (row, patch) => run(async () => { result(await db.from(table).update(patch).eq('id', row.id).select('id').single()); await refresh(); });
  const move = (index, offset) => run(async () => {
    const rows = list.data.rows, neighbor = rows[index + offset]; if (!neighbor) return;
    result(await db.rpc('reorder_content', { p_table: table, p_first: rows[index].id, p_second: neighbor.id })); await refresh();
  });
  return <><Heading title={schema.title} action={<button className="btn btn-primary" disabled={busy} onClick={() => open() }><Plus size={16}/>Add {table === 'social_links' ? 'link' : table === 'skills' ? 'skill' : table.slice(0,-1)}</button>}>Edit existing content, publish when ready, and keep private drafts off the public website.</Heading>
    <Notice error>{list.error}</Notice><Notice error={failure}>{notice}</Notice>
    {draft && <form className="adm-panel" onSubmit={save}><fieldset disabled={busy} className="adm-fieldset"><div className="adm-panel-head"><h2>{draft.title || draft.label || 'New entry'}</h2><button type="button" className="adm-text-button" onClick={() => setDraft(null)}>Close editor</button></div><div className="adm-fields">{schema.fields.map(([key,label,type='text',required]) => <div key={key} className={type === 'textarea' || type === 'lines' ? 'adm-full' : ''}><Field label={label} value={type === 'lines' ? (draft[key] || []).join('\n') : draft[key]} type={Array.isArray(type) ? 'text' : type === 'lines' ? 'textarea' : ['image','resource'].includes(type) ? 'url' : type} options={Array.isArray(type) ? type : undefined} required={required} onChange={v => { change(key, type === 'lines' ? v.split('\n').filter(t => t.trim()) : v); if (key === 'access_type') { change('file_url', ''); change('file_path', ''); setPrivatePath(null); } }}/>{['image','resource'].includes(type) && <label className="adm-upload">Upload {type === 'resource' ? 'PDF' : 'image'}<input type="file" accept={type === 'resource' ? 'application/pdf' : 'image/jpeg,image/png,image/webp,image/avif'} onChange={e => { upload(key,type,e.target.files[0]); e.target.value=''; }}/></label>}{key === 'file_url' && draft.access_type === 'members' && <p className="adm-muted">Private file: {privatePath || 'Not attached'}. Only verified members receive a 60-second download link.</p>}</div>)}
      {table === 'projects' && <div className="adm-full"><Field label="Screenshots (one HTTPS image URL per line)" type="textarea" value={screenshots} onChange={setScreenshots}/><label className="adm-upload">Upload screenshot<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={e => { const file=e.target.files[0]; if(file)run(async()=>{const asset=await uploadAsset(file);setScreenshots(s=>[s,asset.url].filter(Boolean).join('\n'));});e.target.value=''; }}/></label></div>}
      <Field label="Sort order" type="number" value={draft.position} onChange={v => change('position',v)}/>{table !== 'social_links' && <Field label="Published" type="checkbox" value={draft.published} onChange={v => change('published',v)}/>}</div><div className="adm-actions"><button className="btn btn-primary" type="submit">{busy?'Saving…':'Save changes'}</button><button className="btn btn-secondary" type="button" onClick={() => setDraft(null)}>Cancel</button></div><p className="adm-muted">Created: {draft.created_at || 'Not saved'} · Updated: {draft.updated_at || 'Not saved'}</p></fieldset></form>}
    <div className="adm-panel"><div className="adm-toolbar"><input aria-label="Search entries" placeholder="Search entries…" value={search} onChange={e => {setSearch(e.target.value);setPage(0);}}/><select aria-label="Publication filter" value={filter} onChange={e=>{setFilter(e.target.value);setPage(0);}}><option value="all">All entries</option><option value="published">Published / enabled</option><option value="draft">Draft / disabled</option></select></div>
      {list.loading ? <p role="status">Loading entries…</p> : list.data?.rows.length ? <div className="adm-table-wrap"><table><thead><tr><th>Entry</th><th>Status</th><th>Order</th><th>Actions</th></tr></thead><tbody>{list.data.rows.map((row,index) => <tr key={row.id}><td><strong>{row.title || row.label}</strong><small>{row.category || row.platform}</small></td><td>{row.archived?'Archived':row[table==='social_links'?'enabled':'published']?'Published':'Draft'}</td><td><div className="adm-inline">{row.position}<button aria-label={`Move ${row.title||row.label} up`} disabled={busy||index===0} onClick={()=>move(index,-1)}><ArrowUp size={15}/></button><button aria-label={`Move ${row.title||row.label} down`} disabled={busy||index===list.data.rows.length-1} onClick={()=>move(index,1)}><ArrowDown size={15}/></button></div></td><td><div className="adm-inline"><button disabled={busy} onClick={()=>open(row)}><Pencil size={15}/>Edit</button><button disabled={busy} onClick={()=>mutate(row,{[table==='social_links'?'enabled':'published']:!row[table==='social_links'?'enabled':'published']})}>{row[table==='social_links'?'enabled':'published']?'Unpublish':'Publish'}</button>{table==='projects'&&<button disabled={busy} onClick={()=>mutate(row,{archived:!row.archived})}>{row.archived?'Restore':'Archive'}</button>}<button disabled={busy} aria-label={`Delete ${row.title||row.label}`} onClick={()=>{if(confirm('Delete this entry? Uploaded files are retained.'))run(async()=>{result(await db.from(table).delete().eq('id',row.id).select('id').single());await refresh();});}}><Trash2 size={15}/></button>{table!=='social_links'&&<a href={table==='projects'?'/work#projects':table==='skills'?'/#skills':'/resources/'+row.slug} target="_blank" rel="noreferrer" aria-label="Preview public page"><Eye size={15}/></a>}</div></td></tr>)}</tbody></table></div>:<p className="adm-empty">No matching entries. Add your own content when ready.</p>}
      <div className="adm-pagination"><button disabled={!page||busy} onClick={()=>setPage(p=>p-1)}>Previous</button><span>Page {page+1} · {list.data?.count ?? '—'} entries</span><button disabled={busy||(page+1)*50>=(list.data?.count||0)} onClick={()=>setPage(p=>p+1)}>Next</button></div>
    </div></>;
}
