/*
 * @coinsori-strategy v1
 * name: EMA Momentum Breakout
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: SOL trends strongly when it moves — EMA 9/21 crossover
 * catches those directional impulses. ATR rising confirms the move has real
 * momentum (not just a spike), and the EMA20 filter keeps us in cash during
 * bear/range regimes when signals are likely false. This is a clean momentum
 * system tuned for SOL's trending personality.
 * When it buys and sells: BUY when EMA9 crosses above EMA21, RSI > 45, ATR is
 * rising — all confirmed on the SAME closed bar. SELL when EMA9 crosses below
 * EMA21 OR RSI drops below 38 (fast exit).
 * When it does NOT work: In slow grinding uptrends where the fast EMA oscillates
 * around the slow EMA without a clean cross — generates small losses from false
 * crosses. Also fails in volatile ranging where breakouts reverse quickly.
 */
function onUpdate(ctx) {
  const position = ctx.position;
  const price    = ctx.price;

  // ── Trend filter: stay in cash when market is bearish ────────────────
  const ema20 = ctx.ema(20, 1);
  if (ema20 == null) return null;
  const bearMarket = price < ema20;

  // ── EMA crossover signals (1 bar ago = last closed bar) ─────────────
  const ema9      = ctx.ema(9, 1);
  const ema21     = ctx.ema(21, 1);
  const ema9_prev  = ctx.ema(9, 2);
  const ema21_prev = ctx.ema(21, 2);
  if (ema9 == null || ema21 == null || ema9_prev == null || ema21_prev == null) return null;

  const bullCross = ema9_prev <= ema21_prev && ema9 > ema21;
  const bearCross = ema9_prev >= ema21_prev && ema9 < ema21;

  // ── RSI momentum confirmation ────────────────────────────────────────
  const rsi = ctx.rsi(14, 1);
  if (rsi == null) return null;
  const rsiStrong = rsi > 45;   // not overheated; leave room to run
  const rsiWeak   = rsi < 38;   // fast exit before momentum fades

  // ── ATR: rising = momentum confirmed ────────────────────────────────
  const atr     = ctx.atr(14, 1);
  const atrPrev = ctx.atr(14, 2);
  if (atr == null || atrPrev == null) return null;
  const atrRising = atr > atrPrev;

  // ── Volume: compare current bar to 20-bar simple average ───────────
  // ctx.vol = current bar volume (may be partial); ctx.volumes is array of recent vols
  const vols = ctx.volumes;
  if (!vols || vols.length < 20) return null;
  let sum = 0;
  for (let i = 0; i < 20; i++) sum += vols[i];
  const avgVol = sum / 20;
  const volConfirm = ctx.vol > avgVol;

  // ── BUY: bull cross + all confirmations + above EMA20 ───────────────
  if (position === 0) {
    if (bullCross && rsiStrong && atrRising && volConfirm && !bearMarket) {
      ctx.log('BUY — EMA cross up, RSI=' + rsi.toFixed(1) + ', ATR rising, vol confirm');
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  // ── SELL: bear cross OR RSI weak ─────────────────────────────────────
  if (position > 0) {
    if (bearCross || rsiWeak) {
      ctx.log('SELL — EMA cross down or RSI weak, RSI=' + rsi.toFixed(1));
      return { side: 'sell', qty: position };
    }
  }

  return null;
}
