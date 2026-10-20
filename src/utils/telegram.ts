declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        colorScheme?: 'light' | 'dark';
        headerColor?: string;
        backgroundColor?: string;
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
      };
    };
  }
}

let audioCtx: AudioContext | null = null;
let isAudioMuted = false;

export function getAudioMuted(): boolean {
  return isAudioMuted;
}

export function setAudioMuted(muted: boolean): void {
  isAudioMuted = muted;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined' || isAudioMuted) return null;
  if (!audioCtx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctor) {
      try {
        audioCtx = new Ctor();
      } catch {
        audioCtx = null;
      }
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function initTelegramWebApp(): void {
  if (typeof window === 'undefined') return;
  try {
    if (!window.Telegram) {
      window.Telegram = {};
    }
    if (!window.Telegram.WebApp) {
      window.Telegram.WebApp = {
        ready: () => {},
        expand: () => {},
        colorScheme: 'dark',
        headerColor: '#090A0F',
        backgroundColor: '#090A0F',
        setHeaderColor: (c: string) => {
          if (window.Telegram?.WebApp) window.Telegram.WebApp.headerColor = c;
        },
        setBackgroundColor: (c: string) => {
          if (window.Telegram?.WebApp) window.Telegram.WebApp.backgroundColor = c;
        },
        HapticFeedback: {
          impactOccurred: () => {
            try {
              navigator.vibrate?.(10);
            } catch {}
          },
          notificationOccurred: () => {
            try {
              navigator.vibrate?.([12, 24, 12]);
            } catch {}
          },
          selectionChanged: () => {
            try {
              navigator.vibrate?.(5);
            } catch {}
          },
        },
      };
    }
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
    tg.setHeaderColor?.('#090A0F');
    tg.setBackgroundColor?.('#090A0F');
  } catch {
    // Fallback outside Telegram environment
  }
}

export function triggerHaptic(
  kind: 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error' = 'light'
): void {
  try {
    const hf = window.Telegram?.WebApp?.HapticFeedback;
    if (hf) {
      if (kind === 'selection') {
        hf.selectionChanged();
      } else if (kind === 'success' || kind === 'warning' || kind === 'error') {
        hf.notificationOccurred(kind);
      } else {
        hf.impactOccurred(kind);
      }
    }
  } catch {
    // Ignore outside Telegram
  }

  // Synthesize subtle tactile audio feedback
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const pitchJitter = 0.96 + Math.random() * 0.08;

    if (kind === 'selection' || kind === 'light') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520 * pitchJitter, now);
      osc.frequency.exponentialRampToValueAtTime(680 * pitchJitter, now + 0.035);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.045);
    } else if (kind === 'medium' || kind === 'success') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440 * pitchJitter, now);
      osc.frequency.exponentialRampToValueAtTime(880 * pitchJitter, now + 0.09);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.11);
    } else if (kind === 'heavy') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(280 * pitchJitter, now);
      osc.frequency.exponentialRampToValueAtTime(920 * pitchJitter, now + 0.16);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.19);
    } else if (kind === 'warning' || kind === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(175, now + 0.05);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.13);
    }
  } catch {
    // Ignore audio context errors
  }
}
