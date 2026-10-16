import React, { useCallback, useEffect, useState } from 'react';

export function Heading({ title, children, action }) { return <div className="adm-heading"><div><span className="adm-kicker">PORTFOLIO STUDIO</span><h1>{title}</h1>{children && <p>{children}</p>}</div>{action}</div>; }
export function Notice({ error, children }) { return children ? <p className={`adm-notice ${error ? 'adm-error' : ''}`} role={error ? 'alert' : 'status'}>{children}</p> : null; }
export function Field({ label, value, onChange, type = 'text', options, required = false, min, max }) {
  return <label className={`adm-field ${type === 'textarea' ? 'adm-full' : ''}`}><span>{label}</span>{type === 'checkbox' ? <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)}/> : options ? <select value={value ?? ''} onChange={e => onChange(e.target.value)}>{options.map(o => <option key={o} value={o}>{o}</option>)}</select> : type === 'textarea' ? <textarea rows={4} maxLength={20000} required={required} value={value ?? ''} onChange={e => onChange(e.target.value)}/> : <input type={type} min={min} max={max} maxLength={type === 'url' ? 2048 : 500} required={required} value={value ?? ''} onChange={e => onChange(type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)}/>}</label>;
}
export function useQuery(loader, dependencies = []) {
  const [data, setData] = useState(null), [error, setError] = useState(''), [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => { setLoading(true); setError(''); try { setData(await loader()); } catch (err) { setError(err.message || 'Request failed.'); } finally { setLoading(false); } }, dependencies);
  useEffect(() => { refresh(); }, [refresh]);
  return { data, error, loading, refresh, setData };
}
export function result({ data, error }) { if (error) throw error; return data; }
export function date(value) { return value ? new Date(value).toLocaleString('en-IN') : '—'; }
export function csv(rows, name) {
  if (!rows.length) return;
  const cell = value => { let s = String(value ?? ''); if (/^\s*[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replaceAll('"', '""') + '"'; };
  const keys = Object.keys(rows[0]); const blob = new Blob(['\uFEFF' + [keys, ...rows.map(row => keys.map(key => row[key]))].map(row => row.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export class AdminBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="adm-panel"><h2>This panel could not load.</h2><p>Your saved content is unchanged.</p><button className="btn btn-primary" onClick={() => this.setState({ failed: false })}>Try again</button></div> : this.props.children; }
}
