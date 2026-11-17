/**
 * Retroalimentación no visual (vibración / tono breve de confirmación)
 * para acompañar el inicio de grabación, la publicación y la recepción del
 * número de seguimiento cuando el dispositivo lo admita (Sección 8 del MD).
 */

export function triggerUxFeedback(kind = 'action') {
  if (typeof window === 'undefined') return;

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      const pattern = kind === 'success' ? [35, 50, 45] : kind === 'record' ? [25] : [20];
      navigator.vibrate(pattern);
    }
  } catch {
    // Dispositivos sin soporte de vibración continúan sin interrumpir el flujo.
  }

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = kind === 'success' ? 660 : kind === 'record' ? 520 : 440;
    gain.gain.value = 0.025;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.06);
    oscillator.onended = () => {
      void ctx.close().catch(() => {});
    };
  } catch {
    // Si el navegador bloquea AudioContext o no está disponible, se ignora silenciosamente.
  }
}
