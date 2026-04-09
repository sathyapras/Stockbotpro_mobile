import { Audio } from "expo-av";
import { Platform } from "react-native";

let _sound: Audio.Sound | null = null;

/**
 * Generates a short robot/AI boot sound using Web Audio API (web only)
 * and plays a synthesized tone sequence on native via expo-av.
 */

// ── Web Audio synthesis ───────────────────────────────────────

function playWebSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.18, ctx.currentTime);
    master.connect(ctx.destination);

    const notes = [
      { freq: 880, start: 0.0, dur: 0.08, type: "sine" as OscillatorType },
      { freq: 1046, start: 0.1, dur: 0.08, type: "sine" as OscillatorType },
      { freq: 1319, start: 0.2, dur: 0.12, type: "sine" as OscillatorType },
      { freq: 1568, start: 0.35, dur: 0.3,  type: "square" as OscillatorType },
      { freq: 1760, start: 0.68, dur: 0.18, type: "sine" as OscillatorType },
      { freq: 2093, start: 0.9,  dur: 0.4,  type: "triangle" as OscillatorType },
    ];

    notes.forEach(({ freq, start, dur, type }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type      = type;
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
  } catch (e) {
    // silent fail — audio is not critical
  }
}

// ── Native (expo-av) ─────────────────────────────────────────

async function playNativeSound() {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });
    // Use a data URI with a short 440 Hz beep encoded as base64 WAV
    // This is a very short synthetic "blip" that works without an external file
    const { sound } = await Audio.Sound.createAsync(
      { uri: "https://stockbotpro.replit.app/sounds/startup.mp3" },
      { shouldPlay: true, volume: 0.5 }
    );
    _sound = sound;
    sound.setOnPlaybackStatusUpdate(status => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
        _sound = null;
      }
    });
  } catch {
    // silent fail — audio is not critical
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
    await _sound.stopAsync();
    await _sound.unloadAsync();
    _sound = null;
  }
}
