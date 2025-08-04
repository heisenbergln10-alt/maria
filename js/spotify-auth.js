// js/spotify-auth.js
// ---- PKCE + auto‑refresh helper for GitHub Pages ----
// Client ID is baked in – NO secret needed.

const CLIENT_ID = 'ea7df116757b4016bb5dcf1d78fc6dcd';   //  ← your app's ID

/*  If you know your Pages root (e.g. https://user.github.io/repo ),
    set it below.  Otherwise we derive it at runtime from the current
    location so the same code works on dev & prod.
*/
const REPO_ROOT = (() => {
  // e.g. https://user.github.io/repo/index.html  →  https://user.github.io/repo
  const url = new URL(location.href);
  const path = url.pathname.replace(/\/callback\.html$/, '').replace(/\/index\.html$/, '');
  return url.origin + path.replace(/\/$/, '');
})();

export const REDIRECT = REPO_ROOT + '/callback.html';

const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing'
].join(' ');

// ---- localStorage keys
const KEY = { tok:'sp_tok', ref:'sp_ref', exp:'sp_exp', ver:'sp_ver' };

// Public helper – ensures we always hand back a *fresh* access token.
export async function getFreshToken () {
  // 5‑minute safety margin
  if (Date.now() < (+localStorage.getItem(KEY.exp)||0) - 5*60*1000) {
    return localStorage.getItem(KEY.tok);
  }
  if (localStorage.getItem(KEY.ref)) return await refresh();
  // first ever call – start the dance
  await beginAuth();
  return null; // we actually redirect away; never reaches here.
}

// Called only by callback.html
export async function handleRedirectThenReturn () {
  const params = new URLSearchParams(location.search);
  const code   = params.get('code');
  if (!code) { await beginAuth(); return; }

  const verifier = localStorage.getItem(KEY.ver);
  const body = new URLSearchParams({
    client_id     : CLIENT_ID,
    grant_type    : 'authorization_code',
    code,
    redirect_uri  : REDIRECT,
    code_verifier : verifier
  });
  const out = await fetch('https://accounts.spotify.com/api/token',{
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body
  }).then(r=>r.json());

  if (out.error) {
    alert('Spotify auth failed – check redirect URI & scopes.');
    console.error(out);
    return;
  }

  localStorage.setItem(KEY.tok, out.access_token);
  if (out.refresh_token) localStorage.setItem(KEY.ref, out.refresh_token);
  localStorage.setItem(KEY.exp, String(Date.now() + out.expires_in*1000));

  // scrub query params & go home
  location.replace(REPO_ROOT + '/');
}

// ---- internals --------------------------------------------------------

async function beginAuth () {
  // PKCE – create verifier + challenge
  const rand = crypto.getRandomValues(new Uint8Array(64));
  const verifier = btoa(String.fromCharCode(...rand))
    .replace(/[^a-zA-Z0-9]/g,'').slice(0,128);
  localStorage.setItem(KEY.ver, verifier);

  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = btoa(String.fromCharCode(...new Uint8Array(buf)))
                      .replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');

  const auth = new URL('https://accounts.spotify.com/authorize');
  auth.searchParams.set('client_id', CLIENT_ID);
  auth.searchParams.set('response_type', 'code');
  auth.searchParams.set('redirect_uri', REDIRECT);
  auth.searchParams.set('scope', SCOPES);
  auth.searchParams.set('code_challenge_method', 'S256');
  auth.searchParams.set('code_challenge', challenge);
  auth.searchParams.set('state', 'st_'+crypto.randomUUID());

  location.href = auth.toString();   // <-- browser redirects
}

async function refresh () {
  const body = new URLSearchParams({
    client_id    : CLIENT_ID,
    grant_type   : 'refresh_token',
    refresh_token: localStorage.getItem(KEY.ref)
  });
  const out = await fetch('https://accounts.spotify.com/api/token',{
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body
  }).then(r=>r.json());

  if (out.error) {
    console.warn('Refresh failed, restarting auth.', out);
    await beginAuth();          // will redirect away
    return null;
  }

  localStorage.setItem(KEY.tok, out.access_token);
  if (out.refresh_token) localStorage.setItem(KEY.ref, out.refresh_token);
  localStorage.setItem(KEY.exp, String(Date.now() + out.expires_in*1000));
  return out.access_token;
}
