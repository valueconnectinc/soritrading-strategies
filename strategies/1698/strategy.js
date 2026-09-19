/*
 * @coinsori-strategy v1
 * name: Supertrend Momentum v4
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 1000
 *
 * Pure Supertrend crossover with wider bands (ATR mult 4) for SOL's high
 * 4h volatility. Also uses a volatility squeeze filter: only enter when
 * ATR is below 60% of its 20-bar SMA (market coiled before exploding).
 * ATR period shortened to 7 for faster signal response. Long only.
 */

function onUpdate(ctx) {
  // ── guards ───────────────────────────────────────────────────
  const atr    = ctx.atr(7);          if (atr == null) return null;
  if (!ctx.closes || ctx.closes.length < 2) return null;

  // ── squeeze filter: ATR below 60% of its 20-bar SMA ─────────
  // Compute ATR SMA manually from trailing ago values
  let atrSum = 0, atrCount = 0;
  for (let i = 0; i < 20; i++) {
    const a = ctx.atr(7, i);
    if (a != null) { atrSum += a; atrCount++; }
  }
  if (atrCount < 10) return null;   // need at least 10 ATR values
  const atrSma = atrSum / atrCount;
  if (atr >= atrSma * 0.6) return null;  // not coiled enough — skip

  // ── current Supertrend ───────────────────────────────────────
  const closeNow = ctx.closes[0];
  const hl2Now   = (ctx.high(1) + ctx.low(1)) / 2;
  const stMult   = 4;          // wider bands for volatile SOL 4h
  const upperNow = hl2Now + stMult * atr;
  const lowerNow = hl2Now - stMult * atr;

  let dirNow;
  if (closeNow > upperNow)      dirNow = 1;
  else if (closeNow < lowerNow) dirNow = 0;
  else                          dirNow = 1;

  // ── previous Supertrend (bar 1 ago, already closed) ─────────
  const prevAtr   = ctx.atr(7, 1);  if (prevAtr == null) return null;
  const hl2Prev   = (ctx.high(2) + ctx.low(2)) / 2;
  const upperPrev = hl2Prev + stMult * prevAtr;
  const closePrev = ctx.closes[1];

  const dirPrev = closePrev > upperPrev ? 1 : 0;

  // ── exit: direction flip or price below ST value ──────────────
  if (ctx.position > 0) {
    if (dirPrev === 1 && dirNow === 0) {
      return { side: 'sell', qty: ctx.position };
    }
    const stNow = dirNow === 1 ? lowerNow : upperNow;
    if (closeNow < stNow) {
      return { side: 'sell', qty: ctx.position };
    }
    // Profit target: 2x ATR from entry
    const pnl = ctx.price - ctx.entryPx;
    if (pnl >= 2 * atr) {
      return { side: 'sell', qty: ctx.position };
    }
    return null;
  }

  // ── entry: Supertrend flipped bullish + squeeze confirmed ─────
  if (dirPrev === 0 && dirNow === 1) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  return null;
}
