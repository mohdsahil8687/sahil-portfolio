import React, { useState } from 'react';
import { db } from '../backend/client';
import { date, Heading, Notice, result, useQuery } from './ui';

function Trend({ rows, value = 'views', title = 'Daily page views (UTC)' }) {
  const max = Math.max(1, ...rows.map(row => Number(row[value])));
  return <section className="adm-panel"><h2>{title}</h2>{rows.length ? <><div className="adm-chart" role="img" aria-label={title + ': ' + rows.map(row => `${row.day}: ${row[value]}`).join(', ')}>{rows.map(row => <div key={row.day} title={`${row.day}: ${row[value]}`}><i style={{ height: `${Number(row[value]) / max * 100}%` }}/><span>{row.day.slice(5)}</span></div>)}</div><p className="adm-muted">{rows.reduce((n,row)=>n+Number(row[value]),0).toLocaleString()} recorded {value} in this period.</p></> : <p className="adm-empty">No collected data for this period.</p>}</section>;
}
function DataTable({ title, rows, columns }) { return <section className="adm-panel"><h2>{title}</h2>{rows?.length ? <div className="adm-table-wrap"><table><thead><tr>{columns.map(([key,label])=><th key={key}>{label}</th>)}</tr></thead><tbody>{rows.map((row,index)=><tr key={index}>{columns.map(([key])=><td key={key}>{String(row[key]??'—')}</td>)}</tr>)}</tbody></table></div>:<p className="adm-empty">No recorded data yet.</p>}</section>; }

export function Overview({ navigate }) {
  const query = useQuery(async () => {
    const [summary, trend, users, messages, activity] = await Promise.all([
      db.rpc('dashboard_summary'), db.rpc('dashboard_analytics',{p_days:14}),
      db.from('member_profiles').select('full_name,email,created_at').order('created_at',{ascending:false}).limit(5),
      db.from('contact_messages').select('name,subject,created_at').order('created_at',{ascending:false}).limit(5),
      db.from('admin_audit_logs').select('action,entity,created_at').order('created_at',{ascending:false}).limit(5),
    ]);
    return { summary:result(summary),trend:result(trend),users:result(users),messages:result(messages),activity:result(activity) };
  }, []);
  const fields = [['users','Registered users'],['new_today','New today (UTC)'],['new_month','New this month (UTC)'],['projects','Total projects'],['published_projects','Published projects'],['skills','Skills / journey stages'],['books','Books'],['resources','Published resources'],['views','Consented page views'],['visitors','Consented browser sessions'],['unread_messages','Unread inquiries']];
  return <><Heading title="Your portfolio, at a glance.">Live content and recorded activity. Metrics stay empty when the backend cannot be reached.</Heading><Notice error>{query.error}</Notice>{query.loading?<p role="status">Loading dashboard…</p>:query.data&&<><div className="adm-metrics">{fields.map(([key,label])=><div className="adm-metric" key={key}><span>{label}</span><strong>{Number(query.data.summary[key]).toLocaleString()}</strong></div>)}</div><div className="adm-panel adm-actions">{[['projects','Manage projects'],['books','Edit reading notes'],['media','Upload media'],['messages','Read messages']].map(([id,label])=><button className="btn btn-secondary" key={id} onClick={()=>navigate(id)}>{label}</button>)}</div><Trend rows={query.data.trend.daily}/><div className="adm-columns"><DataTable title="Recent registrations" rows={query.data.users} columns={ [['full_name','Name'],['email','Email']] }/><DataTable title="Recent messages" rows={query.data.messages} columns={ [['name','Sender'],['subject','Subject']] }/></div><DataTable title="Recent admin activity" rows={query.data.activity.map(row=>({...row,created_at:date(row.created_at)}))} columns={ [['action','Action'],['entity','Collection'],['created_at','Date']] }/><p className="adm-muted">Legacy page views retained separately: {query.data.summary.legacy_views}. Session counts use a consented random browser-session ID, not a person or cross-device identity.</p></>}</>;
}
export function Analytics() {
  const [days,setDays]=useState(30);
  const query=useQuery(async()=>result(await db.rpc('dashboard_analytics',{p_days:days})),[days]);
  return <><Heading title="Analytics">Only consented events are collected. Views and downloads do not imply learning or completion.</Heading><div className="adm-toolbar"><label>Period <select value={days} onChange={e=>setDays(Number(e.target.value))}>{[7,30,90,365].map(n=><option key={n} value={n}>{n} days</option>)}</select></label><button onClick={query.refresh}>Refresh</button></div><Notice error>{query.error}</Notice>{query.loading?<p role="status">Loading recorded traffic…</p>:query.data&&<><Trend rows={query.data.daily}/><Trend title="Registered-user growth (UTC)" value="registrations" rows={query.data.registrations}/><div className="adm-columns"><DataTable title="Most visited pages" rows={query.data.popular} columns={ [['path','Page'],['views','Views']] }/><DataTable title="Traffic sources" rows={query.data.sources} columns={ [['source','Source'],['views','Views']] }/></div><DataTable title="Resource engagement" rows={query.data.downloads} columns={ [['path','Resource'],['event_type','Recorded action'],['events','Events']] }/><p className="adm-muted">Consented active members: {query.data.active_members}. Anonymous activity is not tied to member profiles without separate account consent. Referrers retain hostname only; ad blockers, denied consent and missing referrers reduce coverage. No fingerprinting, IP retention, or cross-session tracking.</p></>}</>;
}
export function ActivityLogs() {
  const [page,setPage]=useState(0);
  const query=useQuery(async()=>result(await db.from('admin_audit_logs').select('*').order('created_at',{ascending:false}).range(page*50,page*50+49)),[page]);
  return <><Heading title="Activity Logs">Database-generated content change records. Sensitive field values and passwords are never logged.</Heading><Notice error>{query.error}</Notice>{query.loading?<p role="status">Loading activity…</p>:<DataTable title="Administrative changes" rows={(query.data||[]).map(row=>({...row,created_at:date(row.created_at)}))} columns={ [['action','Action'],['entity','Collection'],['record_id','Record'],['actor_id','Admin user ID'],['created_at','Date']] }/>}<div className="adm-pagination"><button disabled={!page} onClick={()=>setPage(p=>p-1)}>Previous</button><span>Page {page+1}</span><button disabled={(query.data?.length||0)<50} onClick={()=>setPage(p=>p+1)}>Next</button></div></>;
}
