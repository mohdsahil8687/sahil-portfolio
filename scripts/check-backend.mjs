import {loadEnv} from 'vite';
import {writeFile} from 'node:fs/promises';

// Read-only diagnostics. Never print credentials, tokens, emails or table rows.
const env=loadEnv('development',process.cwd(),'');
const base=(env.VITE_SUPABASE_URL||'').trim().replace(/\/$/,'');
const key=(env.VITE_SUPABASE_PUBLISHABLE_KEY||env.VITE_SUPABASE_ANON_KEY||'').trim();
let parsed;try{parsed=new URL(base);}catch{}
let claims;try{claims=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString());}catch{}
const publicKey=key.startsWith('sb_publishable_')||claims?.role==='anon';
const report={checkedAt:new Date().toISOString(),configuration:{projectHost:parsed?.hostname||null,publicKeyPresent:!!key,publicKeyType:key.startsWith('sb_publishable_')?'publishable':claims?.role||'unknown',googleFrontendFlag:env.VITE_GOOGLE_AUTH_ENABLED==='true',unsafeViteVariableNames:Object.keys(env).filter(name=>/^VITE_.*(SECRET|SERVICE_ROLE)/i.test(name))},checks:[]};
if(!parsed||parsed.protocol!=='https:'||!publicKey||key.startsWith('sb_secret_'))throw new Error('Configure a valid HTTPS Supabase URL and public publishable/anon key first. Credentials are never printed.');

async function probe(name,path,options={},summarize=()=>({})){
  try{
    const response=await fetch(base+path,{...options,redirect:'manual',signal:AbortSignal.timeout(12000),headers:{apikey:key,'Content-Type':'application/json',...options.headers}});
    let data;try{data=await response.json();}catch{}
    const result={name,status:response.status,...(data?.code?{code:data.code}:{}),...summarize(data,response)};
    report.checks.push(result);
  }catch(error){report.checks.push({name,networkError:error.name,code:error.cause?.code||null});}
}
const tables=['site_settings','services','projects','learning','resources','offers','books','page_views','contact_messages','member_profiles','admin_allowlist','admin_members','analytics_events','media_assets','app_settings','communication_preferences','admin_audit_logs'];
await probe('auth-settings','/auth/v1/settings',{},data=>({googleProviderEnabled:data?.external?.google===true,emailProviderEnabled:data?.external?.email===true,signupDisabled:data?.disable_signup===true}));
await probe('google-authorize','/auth/v1/authorize?provider=google&redirect_to='+encodeURIComponent('http://localhost:5173/admin'),{},(data,response)=>({providerDisabled:typeof data?.msg==='string'&&data.msg.includes('provider is not enabled'),redirectHost:response.headers.get('location')?new URL(response.headers.get('location')).hostname:null}));
await Promise.all(tables.map(table=>probe(`table:${table}`,`/rest/v1/${table}?select=*&limit=0`)));
await Promise.all(['projects','books','resources'].map(table=>probe(`anonymous-drafts:${table}`,`/rest/v1/${table}?select=id&published=eq.false&limit=1`,{},data=>({visibleDraftRows:Array.isArray(data)?data.length:null}))));
for(const rpc of ['is_admin','admin_identity','dashboard_summary'])await probe(`anonymous-rpc:${rpc}`,`/rest/v1/rpc/${rpc}`,{method:'POST',body:'{}'},data=>({...(typeof data==='boolean'?{result:data}:{}),unexpectedPrivilegedResponse:rpc==='dashboard_summary'&&data!=null&&!data.code}));
await probe('edge-function-preflight','/functions/v1/portfolio-api',{method:'OPTIONS',headers:{Origin:'http://localhost:5173','Access-Control-Request-Method':'POST'}},(_,response)=>({allowedOrigin:response.headers.get('access-control-allow-origin')}));
await probe('storage-bucket-list-anonymous','/storage/v1/bucket',{},data=>({visibleBuckets:Array.isArray(data)?data.map(bucket=>({name:bucket.name,public:bucket.public})):null}));
report.checks.sort((a,b)=>a.name.localeCompare(b.name));
const output=JSON.stringify(report,null,2);
if(process.argv.includes('--save'))await writeFile('backend-health-report.json',output+'\n');
console.log(output);
