import { backendUrl, db, publicKey } from '../backend/client';

const types = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif', 'image/svg+xml': 'svg', 'application/pdf': 'pdf' };
export const assetUrl = asset => asset.bucket === 'portfolio-private' ? '' : db.storage.from(asset.bucket).getPublicUrl(asset.path).data.publicUrl;
export async function validateFile(file, bucket) {
  if (!file || file.size === 0 || file.size > 10 * 1024 * 1024) throw new Error('Choose a nonempty file up to 10 MB.');
  if (!types[file.type] || (bucket === 'portfolio-pdfs' && file.type !== 'application/pdf') || (bucket === 'portfolio-media' && !file.type.startsWith('image/')) || (bucket === 'portfolio-private' && file.type === 'image/svg+xml')) throw new Error('Unsupported file type for this bucket.');
  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer()), header = String.fromCharCode(...bytes);
  const valid = file.type === 'application/pdf' ? header.startsWith('%PDF-') : file.type === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 : file.type === 'image/png' ? bytes[0] === 137 && header.slice(1, 4) === 'PNG' : file.type === 'image/webp' ? header.startsWith('RIFF') && header.slice(8, 12) === 'WEBP' : file.type === 'image/avif' ? header.slice(4, 8) === 'ftyp' && /avif|avis/.test(header) : true;
  if (!valid) throw new Error('File contents do not match the selected media type.');
  if (file.type !== 'image/svg+xml') return file;
  const doc = new DOMParser().parseFromString(await file.text(), 'image/svg+xml');
  if (doc.querySelector('parsererror') || doc.documentElement.localName !== 'svg') throw new Error('Invalid SVG.');
  doc.doctype?.remove();
  doc.querySelectorAll('script,style,foreignObject,iframe,object,embed,audio,video,animate,animateTransform,animateMotion,set,a').forEach(node => node.remove());
  doc.querySelectorAll('*').forEach(node => [...node.attributes].forEach(attribute => {
    if (/^on|^style$/i.test(attribute.name) || (/href$/i.test(attribute.name) && !attribute.value.startsWith('#')) || /url\s*\(/i.test(attribute.value)) node.removeAttribute(attribute.name);
  }));
  return new File([new XMLSerializer().serializeToString(doc.documentElement)], file.name, { type: file.type });
}

export async function uploadAsset(file, bucket = 'portfolio-media', onProgress = () => {}) {
  if (!db) throw new Error('Connect Supabase before uploading.');
  const safe = await validateFile(file, bucket);
  const { data, error } = await db.auth.getSession(); if (error) throw error;
  if (!data.session) throw new Error('Sign in before uploading.');
  const path = `uploads/${crypto.randomUUID()}.${types[safe.type]}`;
  await new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', `${backendUrl}/storage/v1/object/${bucket}/${path}`);
    request.timeout = 120000;
    request.setRequestHeader('apikey', publicKey);
    request.setRequestHeader('Authorization', `Bearer ${data.session.access_token}`);
    request.setRequestHeader('Content-Type', safe.type);
    request.setRequestHeader('cache-control', '3600');
    request.upload.onprogress = event => { if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100)); };
    request.onerror = () => reject(new Error('Upload connection failed.'));
    request.ontimeout = () => reject(new Error('Upload timed out.'));
    request.onload = () => request.status >= 200 && request.status < 300 ? resolve() : reject(new Error('Upload failed. Check storage permissions and file limits.'));
    request.send(safe);
  });
  const record = { bucket, path, name: file.name.slice(0, 255), mime_type: safe.type, size: safe.size };
  const inserted = await db.from('media_assets').insert(record).select('*').single();
  if (inserted.error) { await db.storage.from(bucket).remove([path]); throw inserted.error; }
  onProgress(100);
  return { ...inserted.data, url: assetUrl(inserted.data) };
}
