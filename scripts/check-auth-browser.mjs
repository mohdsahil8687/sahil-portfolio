import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createServer,loadEnv} from 'vite';

// All remote requests are intercepted. No real login, token, CRUD or role grant occurs.
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const env=loadEnv('development',process.cwd(),'');
const authOrigin=new URL(env.VITE_SUPABASE_URL).origin;
const projectRef=new URL(authOrigin).hostname.split('.')[0];
const storageKey=`sb-${projectRef}-auth-token`;
const output=join(tmpdir(),'sahil-auth-qa');await mkdir(output,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:5174,strictPort:true,hmr:false},optimizeDeps:{noDiscovery:true,include:[]},define:{'import.meta.env.VITE_GOOGLE_AUTH_ENABLED':'"true"'}});
let browser;
const reports=[];
try{
  await server.listen();
  const base='http://127.0.0.1:5174';
  browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE_PATH?{executablePath:process.env.BROWSER_EXECUTABLE_PATH}:{channel:'chrome'})});
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  const page=await context.newPage();page.setDefaultTimeout(12000);page.setDefaultNavigationTimeout(20000);
  const runtimeErrors=[];page.on('pageerror',error=>runtimeErrors.push(error.message));
  const state={provider:false,admin:false,missing:false,mfa:false,aal:'aal1',serial:0,authorizations:0,pkceExchanges:0,refreshes:0,signouts:0,profileWrites:0,verifiedChallenges:0};
  const userId='00000000-0000-4000-8000-000000000001',factorId='00000000-0000-4000-8000-000000000003';
  const user=()=>({id:userId,aud:'authenticated',role:'authenticated',email:'owner@example.test',email_confirmed_at:'2026-01-01T00:00:00Z',created_at:'2026-01-01T00:00:00Z',app_metadata:{provider:'google',providers:['google']},user_metadata:{role:'owner',full_name:'QA user'},factors:state.mfa?[{id:factorId,factor_type:'totp',status:'verified',friendly_name:'QA authenticator'}]:[]});
  const session=()=>{
    const payload={iss:authOrigin+'/auth/v1',sub:userId,aud:'authenticated',role:'authenticated',aal:state.aal,exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000),jti:'qa-'+(++state.serial)};
    const token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify(payload)).toString('base64url')+'.test-signature';
    return {access_token:token,refresh_token:'qa-refresh-not-a-real-token',token_type:'bearer',expires_in:3600,expires_at:payload.exp,user:user()};
  };
  await context.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.origin===base)return route.continue();
    if(url.origin!==authOrigin)return route.abort();
    const json=(data,status=200,headers={})=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data),headers:{'access-control-allow-origin':base,'access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,HEAD,OPTIONS',...headers}});
    if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':base,'access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,HEAD,OPTIONS'}});
    if(url.pathname==='/auth/v1/settings')return json({external:{google:state.provider,email:true}});
    if(url.pathname==='/auth/v1/authorize'){
      state.authorizations++;
      assert.equal(url.searchParams.get('code_challenge_method'),'s256');
      assert.ok(url.searchParams.get('code_challenge'));
      assert.equal(url.searchParams.get('redirect_to'),base+'/admin');
      return route.fulfill({status:302,headers:{location:base+'/admin?code=qa-one-use-code'}});
    }
    if(url.pathname==='/auth/v1/token'){
      const body=request.postDataJSON();
      if(url.searchParams.get('grant_type')==='pkce'){
        assert.equal(body.auth_code,'qa-one-use-code');assert.ok(body.code_verifier?.length>20);state.pkceExchanges++;
      }else if(url.searchParams.get('grant_type')==='refresh_token')state.refreshes++;
      return json(session());
    }
    if(url.pathname==='/auth/v1/user')return json(user());
    if(url.pathname==='/auth/v1/logout'){state.signouts++;return route.fulfill({status:204,headers:{'access-control-allow-origin':base}});}
    if(url.pathname.endsWith(`/factors/${factorId}/challenge`))return json({id:'qa-challenge',expires_at:Math.floor(Date.now()/1000)+300});
    if(url.pathname.endsWith(`/factors/${factorId}/verify`)){
      assert.equal(request.postDataJSON().code,'123456');state.verifiedChallenges++;state.aal='aal2';return json(session());
    }
    if(url.pathname==='/rest/v1/rpc/admin_identity')return state.missing?json({code:'PGRST202'},404):json(state.admin);
    if(url.pathname==='/rest/v1/rpc/is_admin')return json(state.admin&&(!state.mfa||state.aal==='aal2'));
    if(url.pathname.startsWith('/rest/v1/member_profiles')&&request.method()==='POST')state.profileWrites++;
    if(url.pathname.startsWith('/rest/v1/'))return json([] ,200,{'content-range':'*/0'});
    return json({message:'Not mocked'},404);
  });

  const gate=()=>page.locator('.gate-card h1');
  const open=async()=>{await page.goto(base+'/admin',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Continue with Google',exact:true}).waitFor();};
  const login=()=>page.getByRole('button',{name:'Continue with Google',exact:true}).click();
  const logout=async()=>{
    const button=page.locator('.admin-sidebar').getByRole('button',{name:'Sign out',exact:true});
    if(await button.count())await button.click();else await page.getByRole('button',{name:'Sign out',exact:true}).click();
    await page.getByRole('button',{name:'Continue with Google',exact:true}).waitFor();
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),storageKey),null);
  };
  await open();await login();
  await page.getByRole('alert').filter({hasText:'Google provider is not enabled'}).waitFor();
  assert.equal(state.authorizations,0);assert.equal(new URL(page.url()).pathname,'/admin');
  reports.push('Disabled provider shows an in-app error; no redirect to the raw Supabase 400 page.');

  state.provider=true;state.admin=true;
  await login();await page.locator('.admin-layout').waitFor();
  assert.equal(state.pkceExchanges,1);assert.equal(new URL(page.url()).search,'');
  assert.ok(await page.evaluate(key=>!!localStorage.getItem(key),storageKey));
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('.admin-layout').waitFor();
  assert.equal(state.pkceExchanges,1,'reload restores the stored session without replaying the OAuth code');
  const refreshed=await page.evaluate(async()=>{const {db}=await import('/src/backend/client.js');return !(await db.auth.refreshSession()).error;});
  assert.ok(refreshed);await page.locator('.admin-layout').waitFor();assert.equal(state.refreshes,1);
  await logout();await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Continue with Google',exact:true}).waitFor();
  assert.equal(await page.locator('.admin-layout').count(),0);
  reports.push('SDK PKCE S256/verifier exchange, callback URL cleanup, session persistence/reload, refresh, logout/storage removal and logged-out reload passed with controlled responses.');
  console.log('PASS: controlled PKCE callback, session reload/refresh, logout and provider-error behavior.');

  state.admin=false;
  await login();await page.getByRole('heading',{name:'Signed in, not an admin.',exact:true}).waitFor();
  assert.equal(await page.locator('.admin-layout').count(),0,'forged owner metadata cannot bypass server membership');
  await logout();
  state.admin=true;state.missing=true;
  await login();await page.getByRole('heading',{name:'Admin setup is incomplete.',exact:true}).waitFor();
  assert.equal(await page.locator('.admin-layout').count(),0);await logout();state.missing=false;
  reports.push('Ordinary Google user with forged owner metadata and missing-membership schema both fail closed.');

  state.mfa=true;state.aal='aal1';
  await login();await page.getByRole('heading',{name:'Verify your authenticator.',exact:true}).waitFor();
  assert.equal(await page.locator('.admin-layout').count(),0);
  await page.getByLabel('Six-digit authenticator code').fill('123456');
  await page.getByRole('button',{name:'Verify',exact:true}).click();await page.locator('.admin-layout').waitFor();
  assert.equal(state.verifiedChallenges,1);assert.equal(state.profileWrites,0,'profile identity is never upserted from browser metadata');
  await logout();
  reports.push('Existing TOTP MFA requires a verified challenge and a new database permission check; no browser profile-identity upsert occurs.');
  assert.deepEqual(runtimeErrors,[]);
  await writeFile(join(output,'report.json'),JSON.stringify({status:'PASS',mode:'CONTROLLED MOCKS ONLY',reports,counts:{authorizations:state.authorizations,pkceExchanges:state.pkceExchanges,refreshes:state.refreshes,signouts:state.signouts,mfaChallenges:state.verifiedChallenges},runtimeErrors},null,2));
  console.log(JSON.stringify({status:'PASS',mode:'CONTROLLED MOCKS ONLY',reports,output},null,2));
  await context.close();
}finally{await browser?.close();await server.close();}
