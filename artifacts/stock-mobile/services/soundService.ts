import { Audio } from "expo-av";
import { Platform } from "react-native";

let _sound: Audio.Sound | null = null;

// ── Web Audio synthesis ───────────────────────────────────────

function playWebSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.18, ctx.currentTime);
    master.connect(ctx.destination);

    const notes = [
      { freq: 880,  start: 0.0,  dur: 0.08, type: "sine"     as OscillatorType },
      { freq: 1046, start: 0.1,  dur: 0.08, type: "sine"     as OscillatorType },
      { freq: 1319, start: 0.2,  dur: 0.12, type: "sine"     as OscillatorType },
      { freq: 1568, start: 0.35, dur: 0.3,  type: "square"   as OscillatorType },
      { freq: 1760, start: 0.68, dur: 0.18, type: "sine"     as OscillatorType },
      { freq: 2093, start: 0.9,  dur: 0.4,  type: "triangle" as OscillatorType },
    ];

    notes.forEach(({ freq, start, dur, type }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(1, ctx.currentTime + start + 0.02);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    });

    setTimeout(() => ctx.close(), 2000);
  } catch {
    // silent fail — audio not critical
  }
}

// ── Native (expo-av) — bundled WAV asset ─────────────────────

async function playNativeSound() {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });

    if (_sound) {
      await _sound.stopAsync().catch(() => {});
      await _sound.unloadAsync().catch(() => {});
      _sound = null;
    }

    const { sound } = await Audio.Sound.createAsync(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("../assets/sounds/startup.wav"),
      { shouldPlay: true, volume: 0.6 }
    );
    _sound = sound;

    sound.setOnPlaybackStatusUpdate(status => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
        _sound = null;
      }
    });
  } catch {
    // silent fail — audio not critical
  }
}

// ── Public API ───────────────────────────────────────────────

export async function playStartupSound() {
  if (Platform.OS === "web") {
    playWebSound();
  } else {
    await playNativeSound();
  }
}

export async function stopSound() {
  if (_sound) {
    await _sound.stopAsync().catch(() => {});
    await _sound.unloadAsync().catch(() => {});
    _sound = null;
  }
}
