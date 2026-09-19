/*
 * @coinsori-strategy v1
 * name: Supertrend Momentum
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 1000
 *
 * Uses Supertrend (ATR-based trailing stop) for trend entries with EMA20 trend
 * filter and volume confirmation. Supertrend handles volatile crypto well —
 * its built-in trailing stop locks in profits without needing a fixed target.
 * Long only. Works best in trending markets; loses in choppy sideways.
 */

function onUpdate(ctx) {
  // ── guards ───────────────────────────────────────────────────
  const ema = ctx.ema(20);    if (ema == null) return null;
  const atr = ctx.atr(10);    if (atr == null) return null;
  // closes[0] = current close, closes[1] = previous bar close
  if (!ctx.closes || ctx.closes.length < 2) return null;

  // ── current Supertrend ───────────────────────────────────────
  const closeNow = ctx.closes[0];
  const hl2Now   = (ctx.high(1) + ctx.low(1)) / 2;
  const stMult   = 3;
  const upperNow = hl2Now + stMult * atr;
  const lowerNow = hl2Now - stMult * atr;

  // direction: 1=bullish, 0=bearish
  let dirNow;
  if (closeNow > upperNow)       dirNow = 1;
  else if (closeNow < lowerNow)  dirNow = 0;
  else                           dirNow = 1;  // default to last-known
  const stNow = dirNow === 1 ? lowerNow : upperNow;

  // ── previous Supertrend (bar 1 ago, already closed) ─────────
  const prevAtr   = ctx.atr(10, 1);  if (prevAtr == null) return null;
  const hl2Prev   = (ctx.high(2) + ctx.low(2)) / 2;
  const upperPrev = hl2Prev + stMult * prevAtr;
  const lowerPrev = hl2Prev - stMult * prevAtr;
  const closePrev = ctx.closes[1];

  const dirPrev = closePrev > upperPrev ? 1 : 0;
  const stPrev  = dirPrev === 1 ? lowerPrev : upperPrev;

  // ── volume confirmation (1.5x 20-bar average) ────────────────
  const avgVol = ctx.avgVol(20);   if (avgVol == null) return null;
  const volOk  = ctx.vol >= avgVol * 1.5;

  // ── exit: Supertrend flipped bearish OR price below ST ───────
  if (ctx.position > 0) {
    if (dirPrev === 1 && dirNow === 0) {
      return { side: 'sell', qty: ctx.position };
    }
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

  // ── entry: Supertrend flipped bullish + price > EMA20 + volume ──
  if (dirPrev === 0 && dirNow === 1 && closeNow > ema && volOk) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  return null;
}
