/*
 * @coinsori-strategy v1
 * name: BB ATR Mean Reversion + EMA Trend Filter NEARUSDT 4H
 * ex: binance
 * syms: NEARUSDT
 * interval: 4h
 * cash: 1000
 *
 * Combines BB+ATR regime filter (lower-band mean reversion in calm markets)
 * with EMA9/21 trend confirmation (only buy when above EMA9, avoiding downtrends).
 * Short side disabled — the mean-reversion edge comes from buying dips, not fades.
 * When it buys and sells: buy on lower-band touch in calm, trending market;
 * sell at mid-band, ATR spike, or stop-loss.
 * When it does NOT work: strong downtrends where lower-band touches keep failing;
 * high-ATR events (black swans, news spikes).
 */
function onUpdate(ctx) {
  const s = ctx.state;

  // Initialize state
  if (!s.atrHist) {
    s.atrHist = [];
    s.lastBarI = -1;
  }

  // Re-run on new bar: shift ATR history
  if (ctx.i !== s.lastBarI) {
    s.lastBarI = ctx.i;
    const curAtr = ctx.atr(14);
    if (curAtr != null) {
      s.atrHist.push(curAtr);
      if (s.atrHist.length > 25) s.atrHist.shift();
    }
  }

  // Indicators
  const bb    = ctx.bb(20, 2);
  const atr   = ctx.atr(14);
  const ema9  = ctx.ema(9, 0);
  const ema21 = ctx.ema(21, 0);
  if (bb == null || atr == null || ema9 == null || ema21 == null) return null;

  // ATR 20-bar SMA
  let atrSma = null;
  if (s.atrHist.length >= 20) {
    let sum = 0;
    for (let i = 0; i < 20; i++) sum += s.atrHist[s.atrHist.length - 20 + i];
    atrSma = sum / 20;
  }
  if (atrSma == null) return null;

  const inCalm = atr < atrSma;
  const price  = ctx.price;
  const lower  = bb.lower;
  const mid    = bb.mid;

  // Trend filter: price must be above EMA9 (short-term uptrend)
  const aboveEma = price > ema9;

  // === ENTRY ===
  if (ctx.position === 0) {
    if (price <= lower && inCalm && aboveEma) {
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  // === EXIT ===
  if (ctx.position > 0) {
    if (price >= mid) return { side: 'sell', qty: ctx.position };
    // ATR regime shift
    if (atr > atrSma * 1.5) return { side: 'sell', qty: ctx.position };
    // Stop-loss: 3× ATR below entry
    const stopPx = ctx.entryPx * (1 - 3 * atr / ctx.entryPx);
    if (price <= stopPx) return { side: 'sell', qty: ctx.position };
    // Trend exit: price drops below EMA21 (downtrend confirmation)
    if (price < ema21) return { side: 'sell', qty: ctx.position };
  }

  return null;
}
