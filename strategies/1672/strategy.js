/*
 * @coinsori-strategy v1
 * name: BB ATR Mean Reversion NEARUSDT 4H
 * ex: binance
 * syms: NEARUSDT
 * interval: 4h
 * cash: 1000
 *
 * Mean reversion on Bollinger Band touches, filtered by low volatility regime (ATR below its 20-bar SMA).
 * When price touches the lower band in a calm market → buy. Exit at middle band or if ATR spikes.
 * Short side disabled — avoids fading uptrends which burned other strategies.
 * When it buys and sells: buy on lower-band touch in low-ATR regime; sell at mid-band or on ATR spike.
 * When it does NOT work: strong trending markets where price never reverts to the mean; high-ATR events.
 */
function onUpdate(ctx) {
  // State object to persist ATR history across ticks
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
      if (s.atrHist.length > 25) s.atrHist.shift(); // keep enough for SMA20
    }
  }

  // Warm-up guard
  const bb = ctx.bb(20, 2);
  const atr = ctx.atr(14);
  if (bb == null || atr == null) return null;

  // ATR 20-bar SMA (need at least 20 readings)
  let atrSma = null;
  if (s.atrHist.length >= 20) {
    let sum = 0;
    for (let i = 0; i < 20; i++) sum += s.atrHist[s.atrHist.length - 20 + i];
    atrSma = sum / 20;
  }
  if (atrSma == null) return null;

  // Low-volatility regime: only trade when ATR is below its 20-bar SMA
  const inCalm = atr < atrSma;

  const lower = bb.lower;
  const mid   = bb.mid;
  const upper = bb.upper;
  const price = ctx.price;

  // === ENTRY: price touches lower band in calm market, no open position ===
  if (ctx.position === 0) {
    if (price <= lower && inCalm) {
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  // === EXIT: mid-band, ATR spike, or stop-loss ===
  if (ctx.position > 0) {
    // Take profit at mid-band
    if (price >= mid) {
      return { side: 'sell', qty: ctx.position };
    }

    // ATR regime shift: volatility spiked — exit to avoid extended drawdown
    if (atr > atrSma * 1.5) {
      return { side: 'sell', qty: ctx.position };
    }

    // Stop-loss: 3× ATR below entry (tight, protects capital in failed mean reversion)
    const stopPx = ctx.entryPx * (1 - 3 * atr / ctx.entryPx);
    if (price <= stopPx) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
