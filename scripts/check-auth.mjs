import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'vite';

const vite=await createServer({server:{middlewareMode:true,hmr:false},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom'});
try{
  const {createAuthService,callbackError}=await vite.ssrLoadModule('/src/backend/auth.js');
  const make=({enabled=true,provider=true,verified=true,identity=true,permission=true,missing=false,mfa=false,oauthError=false,logoutError=false}={})=>{
    const calls=[];
    const client={auth:{
      signInWithOAuth:async options=>{calls.push(['oauth',options]);return {error:oauthError?{message:'do-not-echo-provider-details'}:null};},
      getUser:async()=>{calls.push(['user']);return {data:{user:{id:'qa-owner',email_confirmed_at:verified?'2026-01-01':null,user_metadata:{role:'owner'}}},error:null};},
      signOut:async()=>{calls.push(['signout']);return {error:logoutError?{message:'do-not-echo-session-details'}:null};},
      mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal1',nextLevel:mfa?'aal2':'aal1'},error:null}),listFactors:async()=>({data:{totp:[{id:'qa-factor',status:'verified'}]}}),challengeAndVerify:async value=>{calls.push(['mfa',value]);return {error:null};}}
    },rpc:async name=>{calls.push(['rpc',name]);return {data:name==='admin_identity'?identity:permission,error:missing?{code:'PGRST202'}:null};}};
    const service=createAuthService({client,url:'https://project.example.test',key:'qa-public-key',enabled,origin:()=> 'http://localhost:5173',fetcher:async()=>{calls.push(['settings']);return {ok:true,json:async()=>({external:{google:provider}})};}});
    return {service,calls};
  };
  for(const after of ['/admin','/community']){
    const {service,calls}=make();await service.signIn(after);
    assert.deepEqual(calls.find(call=>call[0]==='oauth')[1],{provider:'google',options:{redirectTo:`http://localhost:5173${after}`,scopes:'openid email profile'}});
  }
  for(const after of ['//evil.test','https://evil.test','/admin?next=https://evil.test','/missing'])await assert.rejects(()=>make().service.signIn(after),/Invalid sign-in destination/);
  const disabled=make({enabled:false});await assert.rejects(()=>disabled.service.signIn(),/VITE_GOOGLE_AUTH_ENABLED=true/);assert.deepEqual(disabled.calls,[]);
  const unsupported=make({provider:false});await assert.rejects(()=>unsupported.service.signIn(),/provider is not enabled/);assert.ok(!unsupported.calls.some(call=>call[0]==='oauth'));
  await assert.rejects(()=>make({oauthError:true}).service.signIn(),error=>!error.message.includes('do-not-echo'));
  const offline=createAuthService({client:{},url:'https://project.example.test',key:'qa',enabled:true,fetcher:async()=>{throw new Error('offline');}});
  await assert.rejects(()=>offline.signIn(),/Could not reach Supabase Auth/);
  await assert.rejects(()=>createAuthService({client:null}).signIn(),/not connected/);
  assert.equal((await make().service.adminAccess()).status,'allowed');
  const unverified=make({verified:false});assert.equal((await unverified.service.adminAccess()).status,'denied');assert.ok(!unverified.calls.some(call=>call[0]==='rpc'));
  const ordinary=make({identity:false});assert.equal((await ordinary.service.adminAccess()).status,'denied','forged owner metadata does not grant membership');assert.ok(!ordinary.calls.some(call=>call[1]==='is_admin'));
  assert.equal((await make({missing:true}).service.adminAccess()).status,'setup','missing membership functions fail closed');
  assert.equal((await make({permission:false}).service.adminAccess()).status,'denied');
  const mfa=make({permission:false,mfa:true});assert.equal((await mfa.service.adminAccess()).status,'mfa');
  await assert.rejects(()=>mfa.service.verifyMfa('123'),/six-digit/);await mfa.service.verifyMfa('123456');assert.ok(mfa.calls.some(call=>call[0]==='mfa'&&call[1].factorId==='qa-factor'));
  const exit=make();await exit.service.signOut();assert.ok(exit.calls.some(call=>call[0]==='signout'));
  await assert.rejects(()=>make({logoutError:true}).service.signOut(),/Sign-out could not be completed/);
  assert.equal(callbackError({search:'?error=access_denied',hash:''}),'Google sign-in was cancelled or denied. Please try again.');
  assert.equal(callbackError({search:'',hash:'#skills'}),'');
  assert.ok(!callbackError({search:'?error=invalid&error_description=do-not-echo',hash:''}).includes('do-not-echo'));
  const sql=await readFile('supabase/migrations/20261016_admin_dashboard.sql','utf8');
  assert.ok(sql.includes('m.user_id=(select auth.uid()) and m.active and u.email_confirmed_at is not null'));
  assert.ok(sql.includes('revoke all on public.admin_members from anon, authenticated'));
  assert.ok(!sql.includes("user_metadata->>'role'"));
  const main=await readFile('src/main.jsx','utf8');
  assert.ok(!main.includes("db.from('member_profiles').upsert"),'browser cannot assert verified profile identity');
  assert.ok(main.includes('permission.token===session?.access_token'),'a previous user/session check cannot flash the dashboard');
  assert.ok(main.includes('version!==refreshVersion.current'),'stale content requests cannot repopulate private caches');
  console.log('PASS: Google flag/provider preflight, safe same-origin destinations, controlled errors, verified-user + server membership/permission checks, forged-role rejection, missing-schema denial, MFA challenge, logout errors, callback messages and stale-session/cache guards. Mock/unit checks; live Google/RLS are separate.');
}finally{await vite.close();}
