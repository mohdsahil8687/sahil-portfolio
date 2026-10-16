import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

const MUSIC_SRC = '/audio/websiteopen/mixkit-silent-descent-614.mp3';
const CLICK_SRC = '/audio/cursor/mixkit-fast-small-sweep-transition-166.wav';
const PREFERENCE_KEY = 'sahil-sound-enabled';
const MUSIC_VOLUME = 0.12;
const CLICK_VOLUME = 0.23;
const CLICK_COOLDOWN = 35;

function readPreference() {
  try { return window.localStorage.getItem(PREFERENCE_KEY) !== 'off'; } catch { return true; }
}

export default function SoundSystem() {
  const musicRef = useRef(null);
  const clickRef = useRef(null);
  const lastClickAt = useRef(0);
  const [enabled, setEnabled] = useState(readPreference);
  const [musicBlocked, setMusicBlocked] = useState(false);

  const remember = useCallback(value => {
    setEnabled(value);
    try { window.localStorage.setItem(PREFERENCE_KEY, value ? 'on' : 'off'); } catch { /* storage can be unavailable */ }
  }, []);

  const startMusic = useCallback(() => {
    const music = musicRef.current;
    if (!music || !enabled) return;
    music.volume = MUSIC_VOLUME;
    const attempt = music.play();
    if (attempt?.then) attempt.then(() => setMusicBlocked(false)).catch(() => setMusicBlocked(true));
  }, [enabled]);

  useEffect(() => {
    const music = new Audio(MUSIC_SRC);
    const click = new Audio(CLICK_SRC);
    music.loop = true;
    music.preload = 'auto';
    music.volume = MUSIC_VOLUME;
    click.preload = 'auto';
    click.volume = CLICK_VOLUME;
    musicRef.current = music;
    clickRef.current = click;

    const reportAudioError = event => console.warn(`[SoundSystem] Could not load audio: ${event.currentTarget.src}`);
    music.addEventListener('error', reportAudioError);
    click.addEventListener('error', reportAudioError);
    if (enabled) {
      const attempt = music.play();
      if (attempt?.then) attempt.catch(() => setMusicBlocked(true));
    }

    const handleFirstInteraction = () => startMusic();
    document.addEventListener('click', handleFirstInteraction, { passive: true });
    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      music.pause(); music.removeAttribute('src'); music.load();
      click.pause(); click.removeAttribute('src'); click.load();
      music.removeEventListener('error', reportAudioError);
      click.removeEventListener('error', reportAudioError);
      musicRef.current = null; clickRef.current = null;
    };
  }, []);

  useEffect(() => {
    const music = musicRef.current;
    if (!music) return;
    if (enabled) startMusic();
    else { music.pause(); setMusicBlocked(false); }
  }, [enabled, startMusic]);

  useEffect(() => {
    const handleClick = () => {
      if (!enabled) return;
      const now = performance.now();
      if (now - lastClickAt.current < CLICK_COOLDOWN) return;
      lastClickAt.current = now;
      const click = clickRef.current;
      if (!click) return;
      click.currentTime = 0;
      click.volume = CLICK_VOLUME;
      click.play().catch(() => {});
    };
    document.addEventListener('click', handleClick, { passive: true });
    return () => document.removeEventListener('click', handleClick);
  }, [enabled]);

  return <div className="sound-system" aria-label="Sound controls">
    {enabled && musicBlocked && <button className="sound-enable" type="button" onClick={startMusic}>Enable Sound</button>}
    <button className="sound-toggle" type="button" aria-label={enabled ? 'Mute sounds' : 'Enable sounds'} aria-pressed={enabled} title={enabled ? 'Mute sounds' : 'Enable sounds'} onClick={() => remember(!enabled)}>
      {enabled ? <Volume2 size={17} strokeWidth={1.8} /> : <VolumeX size={17} strokeWidth={1.8} />}
    </button>
  </div>;
}
