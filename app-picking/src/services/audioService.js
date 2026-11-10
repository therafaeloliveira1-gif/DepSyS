// ============================================================================
// MOTOR DE AUDIO SINTÉTICO DE ALTA VELOCIDAD - MOTOS MENDES DEPSYSTEM
// Basado en Web Audio API pura (Cero dependencias, latencia de ~3ms)
// ============================================================================

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Tono agudo ultrarrápido para bip de producto correcto
 * Frecuencia: 1760Hz (Nota A6 - Sine puro y cristalino)
 * Duración: 65ms
 */
export function playBeepSuccess() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, ctx.currentTime);

    // Envolvente rápida para evitar clicks de audio
    gain.gain.setValueAtTime(0.01, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.065);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.07);

    // Vibración táctil corta en dispositivo físico
    if (navigator.vibrate) {
      navigator.vibrate(35);
    }
  } catch (e) {
    console.warn('Audio feedback error:', e);
  }
}

/**
 * Tono grave áspero para código erróneo o producto no perteneciente a la nota
 * Frecuencia: 180Hz (Onda de sierra / Sawtooth)
 * Duración: 220ms
 */
export function playBeepError() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(130, ctx.currentTime + 0.22);

    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.23);

    // Vibración de advertencia
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  } catch (e) {
    console.warn('Audio feedback error:', e);
  }
}

/**
 * Campanada armónica al completar todas las piezas de un repuesto individual
 */
export function playItemCompleted() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [1046.5, 1318.5, 1568.0]; // Do, Mi, Sol
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.05);

      gain.gain.setValueAtTime(0.01, ctx.currentTime + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * 0.05 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.05 + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + i * 0.05);
      osc.stop(ctx.currentTime + i * 0.05 + 0.2);
    });

    if (navigator.vibrate) {
      navigator.vibrate([40, 40, 80]);
    }
  } catch (e) {
    console.warn('Audio feedback error:', e);
  }
}

/**
 * Fanfarria de victoria cuando el 100% de la nota fue separada con éxito
 */
export function playOrderCompleted() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const arpeggio = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    arpeggio.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);

      gain.gain.setValueAtTime(0.01, ctx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.45);
    });

    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 150, 50, 200]);
    }
  } catch (e) {
    console.warn('Audio feedback error:', e);
  }
}
