/** Ржание коня: синтез на Web Audio (без звуковых файлов). Вызывается, когда ходит конь. */
export function playNeigh() {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AC();
    void ctx.resume();
    const t0 = ctx.currentTime, dur = 1.1;
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    // высота: быстрый подъём, затем дрожащее падение
    osc.frequency.setValueAtTime(420, t0);
    osc.frequency.exponentialRampToValueAtTime(1100, t0 + 0.18);
    osc.frequency.exponentialRampToValueAtTime(700, t0 + 0.5);
    osc.frequency.exponentialRampToValueAtTime(260, t0 + dur);
    // вибрато
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 28;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 45;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    // «горло»: полосовой фильтр, который ведёт форманту вверх и вниз
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 2.5;
    bp.frequency.setValueAtTime(900, t0);
    bp.frequency.linearRampToValueAtTime(1800, t0 + 0.25);
    bp.frequency.linearRampToValueAtTime(700, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.06);
    g.gain.setValueAtTime(0.35, t0 + 0.6);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(bp);
    bp.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    lfo.start(t0);
    osc.stop(t0 + dur + 0.05);
    lfo.stop(t0 + dur + 0.05);
    setTimeout(() => ctx.close(), (dur + 0.3) * 1000);
  } catch { /* звук необязателен */ }
}
