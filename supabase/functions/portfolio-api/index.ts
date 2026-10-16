import { createClient } from 'npm:@supabase/supabase-js@2.57.0';
import { HttpError, fail, text, uuid, contact, analytics } from '../_shared/validation.js';

const env = (name: string) => Deno.env.get(name) || '';
const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };

Deno.serve(async request => {
  const origin = request.headers.get('origin') || '';
  const origins = env('ALLOWED_ORIGINS').split(',').map(s => s.trim()).filter(Boolean);
  const headers = { 'Access-Control-Allow-Origin': origins.includes(origin) ? origin : '', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  const respond = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });
  try {
    if (!origins.length) fail(503, 'Server ALLOWED_ORIGINS is not configured.');
    if (origin && !origins.includes(origin)) fail(403, 'Origin is not allowed.');
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') fail(405, 'Use POST.');
    const raw = await request.text(); if (raw.length > 32000) fail(413, 'Request is too large.');
    let input; try { input = JSON.parse(raw); } catch { fail(400, 'Invalid JSON.'); }
    const service = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), clientOptions);
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const userClient = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), { ...clientOptions, global: { headers: { Authorization: `Bearer ${token}` } } });
    const identity = token ? await service.auth.getUser(token) : null;
    const user = identity?.data?.user;
    const verified = !!user?.email_confirmed_at;
    const requireUser = () => { if (!user || !verified) fail(401, 'Sign in with a verified account first.'); return user!; };
    const requireAdmin = async () => { requireUser(); const { data, error } = await userClient.rpc('is_admin'); if (error || data !== true) fail(403, 'Administrator access with required MFA is needed.'); };
    const checked = result => { if (result.error) throw result.error; return result.data; };
    // The managed gateway supplies forwarding headers; no IP is retained in tables/logs.
    const ip = (request.headers.get('x-forwarded-for') || 'unknown').split(',').at(-1)!.trim();
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(env('RATE_LIMIT_SALT') + ':' + ip));
    const ipKey = [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, '0')).join('');
    const rate = async (key: string, limit: number, seconds: number) => { if (!env('RATE_LIMIT_SALT')) fail(503, 'Server rate limiting needs configuration.'); const ok = checked(await service.rpc('consume_rate_limit', { p_key: key, p_limit: limit, p_seconds: seconds })); if (!ok) fail(429, 'Too many requests. Please try again later.'); };

    switch (input.action) {
      case 'contact': {
        const payload = contact(input);
        await rate('contact:' + ipKey, 5, 3600);
        const secret = env('TURNSTILE_SECRET_KEY');
        if (secret) {
          const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: new URLSearchParams({ secret, response: text(input.captcha || '', 1, 3000, 'Verification token') }), signal: AbortSignal.timeout(10000) });
          const proof = await response.json();
          if (!proof.success || proof.action !== 'contact' || !origins.some(o => new URL(o).hostname === proof.hostname)) fail(400, 'Verification failed. Please try again.');
        } else if (!(env('ALLOW_LOCAL_CONTACT_WITHOUT_CAPTCHA') === 'true' && /^http:\/\/localhost:\d+$/.test(origin))) fail(503, 'Contact verification is not configured.');
        checked(await service.from('contact_messages').insert(payload)); return respond({ ok: true });
      }
      case 'analytics': {
        const settings = checked(await service.from('app_settings').select('analytics_enabled,retention_days').eq('id', 1).single());
        if (!settings.analytics_enabled) return respond({ ok: true, collected: false });
        const event = analytics(input);
        await rate('analytics:' + ipKey, 120, 60);
        if (event.event_type === 'resource_completed' && !user) fail(401, 'Completion needs a signed-in account.');
        if (event.path.startsWith('/resources/')) {
          const resource = checked(await service.from('resources').select('id').eq('slug', event.path.split('/')[2]).eq('published', true).maybeSingle());
          if (!resource) fail(404, 'Published resource not found.');
        } else if (event.event_type !== 'page_view') fail(400, 'Resource events need a resource route.');
        const userId = verified ? user!.id : null;
        if (userId) {
          const prefs = checked(await service.from('communication_preferences').select('analytics_consent').eq('user_id', userId).maybeSingle());
          // Anonymous session counts remain anonymous unless the member opts in separately.
          if (!prefs?.analytics_consent) event.user_id = null; else event.user_id = userId;
        }
        checked(await service.from('analytics_events').insert(event));
        if (event.user_id) checked(await service.from('member_profiles').update({ last_activity_at: new Date().toISOString() }).eq('user_id', event.user_id));
        // Bounded incremental retention maintenance; no raw IP, query strings or device fingerprint.
        checked(await service.from('analytics_events').delete().lt('created_at', new Date(Date.now() - settings.retention_days * 86400000).toISOString()));
        return respond({ ok: true, collected: true });
      }
      case 'download': {
        await rate('download:' + ipKey, 30, 60);
        const resource = checked(await service.from('resources').select('id,published,access_type,file_path,file_url').eq('id', uuid(input.id)).eq('published', true).maybeSingle());
        if (!resource) fail(404, 'Resource not found.');
        if (resource.access_type !== 'members') fail(400, 'Use the public resource download.');
        requireUser();
        const file = checked(await service.from('resource_files').select('bucket,path').eq('resource_id', resource.id).single());
        const signed = checked(await service.storage.from(file.bucket).createSignedUrl(file.path, 60));
        return respond({ url: signed.signedUrl });
      }
      case 'users': {
        await requireAdmin(); await rate('users:' + user!.id, 60, 60);
        const page = Math.max(1, Math.min(100000, Number(input.page) || 1));
        const filter = text(input.search || '', 0, 100, 'Search').toLowerCase();
        // Search/filter profiles first; only fetch Auth metadata for the displayed IDs.
        let query = service.from('member_profiles').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range((page - 1) * 50, page * 50 - 1);
        if (filter) query = query.or(`email.ilike.%${filter.replace(/[^a-z0-9@._ -]/g, '')}%,full_name.ilike.%${filter.replace(/[^a-z0-9@._ -]/g, '')}%`);
        if (input.since) { const since = new Date(input.since); if (!Number.isFinite(since.getTime())) fail(400, 'Invalid date.'); query = query.gte('created_at', since.toISOString()); }
        const profiles = await query; checked(profiles);
        const rows = await Promise.all(profiles.data!.map(async profile => {
          const auth = checked(await service.auth.admin.getUserById(profile.user_id));
          return { ...profile, verified: !!auth.user.email_confirmed_at, last_sign_in_at: auth.user.last_sign_in_at || null, account_status: auth.user.banned_until && new Date(auth.user.banned_until) > new Date() ? 'disabled' : auth.user.email_confirmed_at ? 'verified' : 'unverified' };
        }));
        return respond({ rows, count: profiles.count });
      }
      case 'send_email': {
        await requireAdmin(); await rate('email:' + user!.id, 20, 3600);
        if (!env('RESEND_API_KEY') || !env('EMAIL_FROM')) fail(503, 'Email provider and verified sender are not configured.');
        const deliveryId = uuid(input.delivery_id);
        const existing = checked(await service.from('email_deliveries').select('id,status,provider_id').eq('id', deliveryId).maybeSingle());
        if (existing) return respond({ ...existing, duplicate: true });
        let recipient, messageId = null, recipientUserId = null;
        if (input.message_id) { const inquiry = checked(await service.from('contact_messages').select('email,id').eq('id', uuid(input.message_id)).single()); recipient = inquiry.email; messageId = inquiry.id; }
        else { recipientUserId = uuid(input.user_id); const profile = checked(await service.from('member_profiles').select('email').eq('user_id', recipientUserId).single()); recipient = profile.email; }
        // This endpoint is individual, transactional replies only. No marketing/bulk action.
        const subject = text(input.subject, 1, 160, 'Subject').replace(/[\r\n]/g, ' '), body = text(input.body, 1, 10000, 'Message');
        checked(await service.from('email_deliveries').insert({ id: deliveryId, message_id: messageId, recipient_user_id: recipientUserId, recipient, subject, body }));
        let response;
        try {
          response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + env('RESEND_API_KEY'), 'Content-Type': 'application/json', 'Idempotency-Key': deliveryId }, body: JSON.stringify({ from: env('EMAIL_FROM'), to: [recipient], subject, text: body, ...(env('EMAIL_REPLY_TO') ? { reply_to: env('EMAIL_REPLY_TO') } : {}) }), signal: AbortSignal.timeout(15000) });
        } catch {
          checked(await service.from('email_deliveries').update({ status: 'unknown', error: 'Provider response unavailable; check provider before retrying.' }).eq('id', deliveryId));
          fail(502, 'Delivery outcome is unknown. Check provider logs before sending again.');
        }
        const receipt = await response.json();
        if (!response.ok) { checked(await service.from('email_deliveries').update({ status: 'failed', error: 'Provider rejected request (' + response.status + ').' }).eq('id', deliveryId)); fail(502, 'Email provider rejected the message. Check sender/domain setup.'); }
        checked(await service.from('email_deliveries').update({ status: 'accepted', provider_id: receipt.id }).eq('id', deliveryId));
        if (messageId) checked(await service.from('contact_messages').update({ replied_at: new Date().toISOString(), status: 'contacted' }).eq('id', messageId));
        checked(await service.from('admin_audit_logs').insert({ actor_id: user!.id, action: 'EMAIL_ACCEPTED', entity: 'email_deliveries', record_id: deliveryId }));
        return respond({ ok: true, status: 'accepted', provider_id: receipt.id });
      }
      case 'delete_account': {
        requireUser(); await rate('delete:' + user!.id, 3, 3600);
        const identity = checked(await userClient.rpc('admin_identity'));
        if (identity) fail(403, 'An administrator must transfer/remove their role privately before account deletion.');
        if (input.confirmation !== 'DELETE MY ACCOUNT') fail(400, 'Account deletion requires confirmation.');
        checked(await service.from('analytics_events').delete().eq('user_id', user!.id));
        checked(await service.auth.admin.deleteUser(user!.id)); return respond({ ok: true });
      }
      default: fail(400, 'Unknown action.');
    }
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return respond({ error: status === 500 ? 'Backend request failed. Verify migrations and server configuration.' : error.message }, status);
  }
});
