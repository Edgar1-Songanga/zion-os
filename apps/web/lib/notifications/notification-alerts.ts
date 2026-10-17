export type NotificationAlertPreferences = {
  enabled?: boolean;
  sound_enabled?: boolean;
  vibration_enabled?: boolean;
  muted_types?: string[];
  quiet_start?: string | null;
  quiet_end?: string | null;
};

let sharedAudioContext: AudioContext | undefined;

export function unlockNotificationAudio(): void {
  if (typeof window === 'undefined' || !window.AudioContext) return;
  try {
    sharedAudioContext ??= new window.AudioContext();
    if (sharedAudioContext.state === 'suspended') void sharedAudioContext.resume().catch(() => undefined);
  } catch { /* Audio is optional and subject to browser policy. */ }
}

function isQuietNow(start?: string | null, end?: string | null): boolean {
  if (!start || !end) return false;
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const toMinutes = (value: string) => {
    const match = /^(\d{2}):(\d{2})/.exec(value);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
  };
  const from = toMinutes(start);
  const until = toMinutes(end);
  if (from === null || until === null || from === until) return false;
  return from < until ? current >= from && current < until : current >= from || current < until;
}

export function playNotificationAlert(type: string, preferences: NotificationAlertPreferences | null | undefined, repeat = false): () => void {
  const settings = preferences ?? {};
  if (settings.enabled === false || settings.muted_types?.includes(type) || isQuietNow(settings.quiet_start, settings.quiet_end)) return () => undefined;
  let stopped = false;
  let timer: number | undefined;
  const beep = () => {
    if (stopped || settings.sound_enabled === false || typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) return;
    try {
      sharedAudioContext ??= new AudioContextClass();
      const audio = sharedAudioContext;
      const playTone = () => {
        if (stopped || audio.state !== 'running') return;
        try {
          const oscillator = audio.createOscillator();
          const gain = audio.createGain();
          oscillator.type = 'sine';
          oscillator.frequency.value = type.includes('call') ? 880 : 660;
          gain.gain.setValueAtTime(0.0001, audio.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.12, audio.currentTime + 0.025);
          gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.24);
          oscillator.connect(gain);
          gain.connect(audio.destination);
          oscillator.start();
          oscillator.stop(audio.currentTime + 0.25);
        } catch { /* Browser audio policy may require prior user interaction. */ }
      };
      if (audio.state === 'suspended') {
        // Wait for resume before scheduling the tone; scheduling while suspended can be inaudible.
        void audio.resume().then(playTone).catch(() => undefined);
      } else {
        playTone();
      }
    } catch { /* Browser audio policy may require prior user interaction. */ }
  };
  const vibrate = () => {
    if (stopped || settings.vibration_enabled === false || typeof navigator === 'undefined') return;
    try { if ('vibrate' in navigator) navigator.vibrate(type.includes('call') ? [400, 120, 400, 120, 700] : [180, 80, 180]); } catch { /* Device support is optional. */ }
  };
  const alertOnce = () => { beep(); vibrate(); };
  alertOnce();
  if (repeat && typeof window !== 'undefined') timer = window.setInterval(alertOnce, 1800);
  return () => {
    stopped = true;
    if (timer !== undefined && typeof window !== 'undefined') window.clearInterval(timer);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(0);
  };
}
