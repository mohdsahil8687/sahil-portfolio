import { createClient } from '@supabase/supabase-js';

export const backendUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
export const publicKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
// A Vite variable is public. Refuse accidentally supplied secret/service-role keys.
function publicCredential(key) {
  if (key.startsWith('sb_secret_')) return false;
  if (key.startsWith('sb_publishable_')) return true;
  try { return JSON.parse(atob(key.split('.')[1])).role === 'anon'; } catch { return false; }
}
export const configured = /^https:\/\/[^/]+$/.test(backendUrl) && !backendUrl.includes('YOUR-PROJECT') && publicCredential(publicKey);
export const db = configured ? createClient(backendUrl, publicKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
  global: { fetch: (input, init) => fetch(input, { ...init, signal: init?.signal || AbortSignal.timeout(15000) }) },
}) : null;
export const googleEnabled = String(import.meta.env.VITE_GOOGLE_AUTH_ENABLED || '').trim().toLowerCase() === 'true';

export async function invoke(name, body) {
  if (!db) throw new Error('Connect Supabase in .env and restart Vite first.');
  const { data, error } = await db.functions.invoke(name, { body });
  if (error) {
    let detail;
    try { detail = await error.context?.json(); } catch { /* Non-JSON gateway failure. */ }
    throw new Error(detail?.error || error.message || 'Backend request failed.');
  }
  return data;
}

export function safeUrl(value, { local = false, email = false } = {}) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (local && /^\/(?!\/)[\w/%.#?=&-]*$/.test(text)) return text;
  if (email && /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return text;
  try { const url = new URL(text); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; } catch { return ''; }
}
