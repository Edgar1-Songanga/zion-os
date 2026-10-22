export type NotificationAlertPreferences = {
  enabled?: boolean;
  sound_enabled?: boolean;
  vibration_enabled?: boolean;
  muted_types?: string[];
  quiet_start?: string | null;
  quiet_end?: string | null;
};

let sharedAudioContext: AudioContext | undefined;

/** Must be called from a user gesture to satisfy browser autoplay policies. */
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

/**
 * Plays one short, polished two-note chime and one bounded haptic pattern.
 * Incoming calls intentionally do not loop: the alert always stops by itself.
 * The browser and operating system remain authoritative for audio/vibration.
 */
export function playNotificationAlert(
  type: string,
  preferences: NotificationAlertPreferences | null | undefined,
  _repeat = false,
): () => void {
  const settings = preferences ?? {};
  if (settings.enabled === false || settings.muted_types?.includes(type) || isQuietNow(settings.quiet_start, settings.quiet_end)) {
    return () => undefined;
  }

  let stopped = false;
  const audioNodes: OscillatorNode[] = [];
  const gainNodes: GainNode[] = [];

  const beep = () => {
    if (stopped || settings.sound_enabled === false || typeof window === "undefined" || !window.AudioContext) return;
    try {
      sharedAudioContext ??= new window.AudioContext();
      const audio = sharedAudioContext;
      const play = () => {
        if (stopped || audio.state !== "running") return;
        const call = type.toLowerCase().includes("call");
        // A warm, clear two-note signature; all audio ends within about 1.25s.
        const notes = call ? [{ at: 0, hz: 784, duration: 0.22 }, { at: 0.28, hz: 988, duration: 0.28 }, { at: 0.72, hz: 784, duration: 0.22 }, { at: 1.0, hz: 988, duration: 0.24 }]
          : [{ at: 0, hz: 659, duration: 0.2 }, { at: 0.25, hz: 880, duration: 0.28 }];
        for (const note of notes) {
          const oscillator = audio.createOscillator();
          const gain = audio.createGain();
          const start = audio.currentTime + note.at;
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(note.hz, start);
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(0.18, start + 0.025);
          gain.gain.setValueAtTime(0.18, start + Math.max(0.04, note.duration - 0.06));
          gain.gain.exponentialRampToValueAtTime(0.0001, start + note.duration);
          oscillator.connect(gain);
          gain.connect(audio.destination);
          oscillator.start(start);
          oscillator.stop(start + note.duration + 0.01);
          audioNodes.push(oscillator);
          gainNodes.push(gain);
        }
      };
      if (audio.state === "suspended") void audio.resume().then(play).catch(() => undefined);
      else play();
    } catch { /* Audio may require a prior explicit user gesture. */ }
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
    for (const oscillator of audioNodes) {
      try { oscillator.stop(); } catch { /* Already stopped. */ }
      try { oscillator.disconnect(); } catch { /* Already disconnected. */ }
    }
    for (const gain of gainNodes) {
      try { gain.disconnect(); } catch { /* Already disconnected. */ }
    }
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate(0); } catch { /* Optional device capability. */ }
    }
  };
}
