import {db,backendUrl,publicKey,googleEnabled} from './client';

export function callbackError(location){
  if(!location)return '';
  const query=new URLSearchParams(location.search||'');
  const fragment=new URLSearchParams((location.hash||'').replace(/^#/,''));
  const code=query.get('error_code')||query.get('error')||fragment.get('error_code')||fragment.get('error');
  if(!code)return '';
  return code==='access_denied'?'Google sign-in was cancelled or denied. Please try again.':'Sign-in could not be completed. Check the Google callback and Supabase redirect URLs in docs/ADMIN_SETUP.md, then try again.';
}
export const initialCallbackError=typeof window==='undefined'?'':callbackError(window.location);

export function createAuthService({client,url,key,enabled,fetcher=globalThis.fetch,origin=()=>window.location.origin}){
  const connected=()=>{if(!client)throw new Error('Supabase is not connected. Configure .env.local and restart Vite.');};
  return {
    async signIn(after='/admin'){
      connected();
      if(!['/admin','/community'].includes(after))throw new Error('Invalid sign-in destination.');
      if(!enabled)throw new Error('Google sign-in is disabled in .env.local. Complete docs/ADMIN_SETUP.md, enable Google in Supabase, then set VITE_GOOGLE_AUTH_ENABLED=true and restart Vite.');
      let response;
      try{response=await fetcher(`${url}/auth/v1/settings`,{headers:{apikey:key},signal:AbortSignal.timeout(12000),cache:'no-store'});}
      catch{throw new Error('Could not reach Supabase Auth. Check the project URL and connection, then retry.');}
      if(!response.ok)throw new Error('Supabase Auth configuration could not be checked. Verify the project URL and public key.');
      const settings=await response.json();
      if(settings.external?.google!==true)throw new Error('Google provider is not enabled in this Supabase project. Enable Authentication → Sign In / Providers → Google and configure its Client ID and Secret. See docs/ADMIN_SETUP.md.');
      const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:new URL(after,origin()).href,scopes:'openid email profile'}});
      if(error)throw new Error('Google sign-in could not start. Check provider and redirect settings, then retry.');
    },
    async adminAccess(){
      connected();
      const {data,error}=await client.auth.getUser();
      if(error||!data?.user)return {status:'denied',message:'Your session could not be verified. Sign out and sign in again.'};
      if(!data.user.email_confirmed_at)return {status:'denied',message:'A verified account is required.'};
      const identity=await client.rpc('admin_identity');
      if(identity.error)return {status:'setup',message:'Admin authorization is unavailable. Apply the dashboard migrations and verified-owner bootstrap in docs/ADMIN_SETUP.md. Access remains denied.'};
      if(identity.data!==true)return {status:'denied',message:'This verified account has no active administrator membership.'};
      const permission=await client.rpc('is_admin');
      if(permission.error)return {status:'setup',message:'Admin permission checks failed. Check the dashboard migrations and database permissions.'};
      if(permission.data===true)return {status:'allowed'};
      const assurance=await client.auth.mfa.getAuthenticatorAssuranceLevel();
      if(!assurance.error&&assurance.data?.nextLevel==='aal2'&&assurance.data.currentLevel!=='aal2')return {status:'mfa',message:'Verify the authenticator already enrolled on your admin account.'};
      return {status:'denied',message:'Administrator access was denied by the database.'};
    },
    async verifyMfa(code){
      connected();
      if(!/^\d{6}$/.test(code))throw new Error('Enter the six-digit authenticator code.');
      const factors=await client.auth.mfa.listFactors();
      const factor=factors.data?.totp?.find(item=>item.status==='verified');
      if(factors.error||!factor)throw new Error('A verified authenticator could not be found for this account.');
      const result=await client.auth.mfa.challengeAndVerify({factorId:factor.id,code});
      if(result.error)throw new Error('Authenticator verification failed. Use a fresh code and retry.');
      // Authorization is checked again by adminAccess with the new server-issued session.
    },
    async signOut(){
      connected();
      const {error}=await client.auth.signOut();
      if(error)throw new Error('Sign-out could not be completed. Check your connection and try again.');
    }
  };
}
export const authService=createAuthService({client:db,url:backendUrl,key:publicKey,enabled:googleEnabled});
