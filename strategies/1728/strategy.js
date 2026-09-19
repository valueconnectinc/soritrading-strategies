/*
 * @coinsori-strategy v1
 * name: Funding Rate + OI Sentiment Momentum
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Funding rate and open interest detect when leveraged longs/shorts
 * are crowded — crowded trades mean reversals; expanding OI with positive funding means
 * the move has real money behind it. This is a fundamentally different signal from
 * price-only indicators like EMA crosses.
 * When it buys and sells: Entry when funding turns positive AND OI is rising (bullish
 * leverage accumulation). Exit when funding goes negative OR OI starts falling (crowding
 * unwinds). No entry if funding is near zero (neutral — no conviction either way).
 * When it does NOT work: In slow grinding trends where funding stays slightly positive
 * for months without the explosive move that follows crowded positioning — false signals
 * in ranging, low-volatility regimes where OI barely moves.
 */

function onUpdate(ctx) {
  // ── State: carry previous-bar funding & OI across ticks ─────
  const s = ctx.state;
  if (s.lastBarI !== ctx.i) {
    s.prevFR = s.curFR;
    s.prevOI = s.curOI;
    s.lastBarI = ctx.i;
  }

  // ── Current bar data ─────────────────────────────────────────
  const oi = ctx.binanceOi ? ctx.binanceOi() : null;
  const fr = oi ? oi.fundingRate : null;

  if (fr !== null) s.curFR = fr;
  if (oi && oi.openInterest != null) s.curOI = oi.openInterest;

  // ── Indicators ───────────────────────────────────────────────
  const ema9  = ctx.ema(9);
  const ema21 = ctx.ema(21);
  const rsi   = ctx.rsi(14);
  const atr   = ctx.atr(14);

  if (ema9 == null || ema21 == null || rsi == null || atr == null) return null;

  // ── OI momentum: rising = new money entering ─────────────────
  const oiRising = (s.curOI != null && s.prevOI != null) ? s.curOI > s.prevOI : null;

  // ── Funding state ────────────────────────────────────────────
  const fundPositive = s.curFR != null && s.curFR > 0.0001;
  const fundNegative = s.curFR != null && s.curFR < -0.0001;
  const fundJustPos  = (s.curFR != null && s.prevFR != null)
    ? (s.prevFR <= 0.0001 && s.curFR > 0.0001) : false;
  const hasFundingData = s.curFR != null;

  const inPos  = ctx.position > 0;
  const flat   = ctx.position === 0;

  // ── Price-based trend ────────────────────────────────────────
  const trendUp  = ema9 > ema21;
  const trendDn  = ema9 < ema21;
  const rsiOk    = rsi > 40 && rsi < 75;
  const rsiWeak  = rsi < 40;
  const oiFalling = oiRising === false;

  // ── Entry logic ──────────────────────────────────────────────
  // Primary: funding just flipped positive + OI rising + trend up + RSI in range
  // Fallback (no funding data): EMA cross up + RSI in range + ATR确认波动够大
  const primaryEntry = fundJustPos && oiRising === true && trendUp && rsiOk && flat;
  const fallbackEntry = !hasFundingData && trendUp && rsiOk && flat && atr > 0;

  const entrySignal = primaryEntry || fallbackEntry;

  if (entrySignal) {
    const sl = ctx.price * (1 - 2 * atr / ctx.price); // 2× ATR stop
    return {
      side: 'buy',
      qty: ctx.cash / ctx.price * 0.98,
      type: 'limit',
      price: ctx.price,
      postOnly: true,
      trigger: { side: 'sell', type: 'stop', price: sl }
    };
  }

  // ── Exit logic ───────────────────────────────────────────────
  // In position: exit on funding negative, OI falling, trend broken, or RSI weak
  // Also exit on strong bearish EMA cross even without funding data
  const exitSignal = inPos && (
    fundNegative || oiFalling || trendDn || rsiWeak
  );

  if (exitSignal) {
    return { side: 'sell', qty: ctx.position, type: 'market' };
  }

  return null;
}
