export class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
export const fail = (status, message) => { throw new HttpError(status, message); };
export function text(value, min, max, label) {
  if (typeof value !== 'string') fail(400, `${label} must be text.`);
  const clean = value.trim();
  if (clean.length < min || clean.length > max) fail(400, `${label} must contain ${min}–${max} characters.`);
  return clean;
}
export function email(value) {
  const clean = text(value, 5, 254, 'Email');
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(clean)) fail(400, 'Enter a valid email address.');
  return clean;
}
export function uuid(value) { if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value || '')) fail(400, 'Invalid record ID.'); return value; }
export function path(value) { if (typeof value !== 'string' || !/^\/[a-zA-Z0-9/_-]*$/.test(value) || value.length > 160 || value.startsWith('/admin')) fail(400, 'Invalid public path.'); return value; }
export function contact(input) {
  if (input.website) fail(400, 'Unable to accept this submission.');
  const phone = text(input.contact_number || '', 0, 40, 'Phone');
  if (phone && !/^[+0-9(). -]{7,40}$/.test(phone)) fail(400, 'Enter a valid contact number.');
  return { name: text(input.name, 2, 100, 'Name'), email: email(input.email), contact_number: phone, project_type: text(input.project_type || '', 0, 120, 'Project type'), subject: text(input.subject || input.project_type || 'Portfolio inquiry', 0, 160, 'Subject'), message: text(input.message, 10, 3000, 'Message'), status: 'new' };
}
export function analytics(input) {
  if (input.consent !== true) fail(400, 'Analytics requires consent.');
  if (!['page_view', 'resource_download', 'resource_completed'].includes(input.event_type)) fail(400, 'Unknown analytics event.');
  let referrer = '';
  if (input.referrer) { try { const u = new URL(input.referrer); if (['https:', 'http:'].includes(u.protocol)) referrer = u.hostname.slice(0, 255); } catch { /* Ignore invalid referrers. */ } }
  return { event_type: input.event_type, path: path(input.path), visitor_id: uuid(input.visitor_id), referrer };
}
