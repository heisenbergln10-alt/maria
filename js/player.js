
// js/player.js
import { getFreshToken } from './spotify-auth.js';

let token = await getFreshToken();

// Ensure token stays fresh every 45 min
setInterval(async () => { token = await getFreshToken(); }, 45*60*1000);

window.onSpotifyWebPlaybackSDKReady = () => {
  const player = new Spotify.Player({
    name: 'Maria — Celestial Symphony',
    getOAuthToken: cb => cb(token),
    volume: 0.7
  });

  let deviceId = null;

  player.addListener('ready', e => { deviceId = e.device_id; });
  player.addListener('not_ready', e => console.info('Device offline', e.device_id));
  player.addListener('authentication_error', e => alert('Token error: '+e.message));
  player.addListener('initialization_error', e => alert('Init error: '+e.message));
  player.addListener('account_error', e => alert('Spotify Premium is required.'));

  // ---- UI wiring ----------------------------------------------------
  const playBtn  = document.getElementById('play-pause');
  const nextBtn  = document.getElementById('next-track');
  const prevBtn  = document.getElementById('prev-track');

  playBtn?.addEventListener('click', ()=> player.togglePlay());
  nextBtn?.addEventListener('click', ()=> player.nextTrack());
  prevBtn?.addEventListener('click', ()=> player.previousTrack());

  // Playlist items need data-spotify-uri
  document.querySelectorAll('.playlist-item').forEach(item=>{
    const uri = item.dataset.spotifyUri;
    if(!uri) return;
    item.addEventListener('click', ()=> playUri(uri));
  });

  async function playUri (uri) {
    token = await getFreshToken();
    const res = await fetch(
      `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
      {
        method:'PUT',
        headers:{
          'Authorization':'Bearer '+token,
          'Content-Type':'application/json'
        },
        body: JSON.stringify({ uris:[uri] })
      });
    if(res.status === 401) {           // token maybe expired – retry once
      token = await getFreshToken();
      await fetch(
        `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
        {
          method:'PUT',
          headers:{
            'Authorization':'Bearer '+token,
            'Content-Type':'application/json'
          },
          body: JSON.stringify({ uris:[uri] })
        });
    }
  }

  // keep UI in sync
  player.addListener('player_state_changed', state => {
    if(!state) return;
    const track = state.track_window.current_track;
    document.getElementById('track-title').textContent  = track.name;
    document.getElementById('track-artist').textContent = track.artists.map(a=>a.name).join(', ');
    // ...add your progress‑bar & vinyl‑spin updates here...
  });

  player.connect();
};
