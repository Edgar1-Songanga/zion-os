export type NotificationAlertPreferences = {
  enabled?: boolean;
  sound_enabled?: boolean;
  vibration_enabled?: boolean;
  muted_types?: string[];
  quiet_start?: string | null;
  quiet_end?: string | null;
};

let sharedAudioContext: AudioContext | undefined;

function isQuietNow(start?: string | null, end?: string | null): boolean {
  if (!start || !end) return false;
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const toMinutes = (value: string) => {
    const match = /^(\d{2}):(\d{2})/.exec(value);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  };
  const from = toMinutes(start);
  const until = toMinutes(end);
  if (from === null || until === null || from === until) return false;
  return from < until ? current >= from && current < until : current >= from || current < until;
}

/**
 * Client-side alert only. Browser audio autoplay policy and device vibration
 * support remain authoritative; this function never bypasses either.
 */
export function playNotificationAlert(
  type: string,
  preferences: NotificationAlertPreferences | null | undefined,
  repeat = false,
): () => void {
  const settings = preferences ?? {};
  if (settings.enabled === false || settings.muted_types?.includes(type) || isQuietNow(settings.quiet_start, settings.quiet_end)) {
    return () => undefined;
  }

  let stopped = false;
  let timer: number | undefined;

  const beep = () => {
    if (stopped || settings.sound_enabled === false || typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) return;
    try {
      sharedAudioContext ??= new AudioContextClass();
      const audio = sharedAudioContext;
      if (audio.state === 'suspended') void audio.resume().catch(() => undefined);
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
    } catch {
      // Browsers can block audio until the user interacts with the page.
    }
  };

  const vibrate = () => {
    if (stopped || settings.vibration_enabled === false || typeof navigator === 'undefined') return;
    try {
      if ('vibrate' in navigator) navigator.vibrate(type.includes('call') ? [250, 120, 250] : [120, 60, 120]);
    } catch {
      // Vibration is optional and device/browser-dependent.
    }
  };

  const alertOnce = () => { beep(); vibrate(); };
  alertOnce();
  if (repeat) timer = window.setInterval(alertOnce, 1800);


  return () => {
    stopped = true;
    if (timer !== undefined) window.clearInterval(timer);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(0);
  };
}
