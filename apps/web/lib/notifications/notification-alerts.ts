export type NotificationAlertPreferences = {
  enabled?: boolean;
  sound_enabled?: boolean;
  vibration_enabled?: boolean;
  muted_types?: string[];
  quiet_start?: string | null;
  quiet_end?: string | null;
};

let sharedAudioContext: AudioContext | undefined;

/** Call from a user gesture to satisfy browser autoplay policies. */
export function unlockNotificationAudio(): void {
  if (typeof window === "undefined" || !window.AudioContext) return;
  try {
    sharedAudioContext ??= new window.AudioContext();
    if (sharedAudioContext.state === "suspended") void sharedAudioContext.resume().catch(() => undefined);
  } catch { /* Audio is optional and subject to browser policy. */ }
}

function isQuietNow(start?: string | null, end?: string | null): boolean {
  if (!start || !end) return false;
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const toMinutes = (value: string) => {
    const match = /^(\d{2}):(\d{2})$/.exec(value);
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

/** A short premium chime and one bounded vibration. Never loops, including incoming calls. */
export function playNotificationAlert(
  type: string,
  preferences: NotificationAlertPreferences | null | undefined,
  _repeat = false,
): () => void {
  const settings = preferences ?? {};
  if (settings.enabled === false || settings.muted_types?.includes(type) || isQuietNow(settings.quiet_start, settings.quiet_end)) return () => undefined;

  let stopped = false;
  const oscillators: OscillatorNode[] = [];
  const gains: GainNode[] = [];
  const beep = () => {
    if (stopped || settings.sound_enabled === false || typeof window === "undefined" || !window.AudioContext) return;
    try {
      sharedAudioContext ??= new window.AudioContext();
      const audio = sharedAudioContext;
      const play = () => {
        if (stopped || audio.state !== "running") return;
        const isCall = type.toLowerCase().includes("call");
        const notes = isCall
          ? [{ at: 0, hz: 784, duration: 0.22 }, { at: 0.28, hz: 988, duration: 0.28 }, { at: 0.72, hz: 784, duration: 0.22 }, { at: 1.0, hz: 988, duration: 0.24 }]
          : [{ at: 0, hz: 659, duration: 0.2 }, { at: 0.25, hz: 880, duration: 0.28 }];
        for (const note of notes) {
          const oscillator = audio.createOscillator();
          const gain = audio.createGain();
          const start = audio.currentTime + note.at;
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(note.hz, start);
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(0.22, start + 0.025);
          gain.gain.setValueAtTime(0.22, start + Math.max(0.04, note.duration - 0.06));
          gain.gain.exponentialRampToValueAtTime(0.0001, start + note.duration);
          oscillator.connect(gain);
          gain.connect(audio.destination);
          oscillator.start(start);
          oscillator.stop(start + note.duration + 0.01);
          oscillators.push(oscillator);
          gains.push(gain);
        }
      };
      if (audio.state === "suspended") void audio.resume().then(play).catch(() => undefined);
      else play();
    } catch { /* Browser audio may require explicit user interaction. */ }
  };

  const vibrate = () => {
    if (stopped || settings.vibration_enabled === false || typeof navigator === "undefined") return;
    try {
      if ("vibrate" in navigator) navigator.vibrate(type.toLowerCase().includes("call") ? [180, 70, 180] : [140, 60, 140]);
    } catch { /* Vibration is optional and device/browser-dependent. */ }
  };

  beep();
  vibrate();
  return () => {
    stopped = true;
    for (const oscillator of oscillators) {
      try { oscillator.stop(); } catch { /* Already stopped. */ }
      try { oscillator.disconnect(); } catch { /* Already disconnected. */ }
    }
    for (const gain of gains) { try { gain.disconnect(); } catch { /* Already disconnected. */ } }
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate(0); } catch { /* Optional device capability. */ }
    }
  };
}
