/*
 * @coinsori-strategy v1
 * name: MACD ATR Trailing Stop
 * ex: binance
 * syms: XRPUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: MACD crossover catches trend starts; ATR-based position sizing
 * keeps risk constant across volatility regimes, and an ATR trailing stop locks
 * profits without exiting on normal pullbacks.
 * When it buys and sells: Buys when MACD line crosses above signal line on rising
 * volume; sells when ATR trailing stop is hit or MACD crosses back down.
 * When it does NOT work: Choppy markets with no clear trend — MACD whipsaws and
 * trailing stops get hit repeatedly, eroding small gains.
 */
function onUpdate(ctx) {
  // Indicators
  const macdFast = 12, macdSlow = 26, macdSig = 9;
  const atrN = 14;
  const emaFilter = 200;

  // Read closed bars only (1 = previous bar, 2 = two bars ago)
  const macd1 = ctx.macd(macdFast, macdSlow, macdSig, 1);
  const macd2 = ctx.macd(macdFast, macdSlow, macdSig, 2);
  const macd0 = ctx.macd(macdFast, macdSlow, macdSig, 0);
  const atr = ctx.atr(atrN, 1);
  const ema200 = ctx.ema(emaFilter, 1);

  // Volume: compare current bar vol to 20-bar average
  const avgVol = ctx.avgVol(20);
  const volNow = ctx.vol;

  if (macd1 == null || macd2 == null || macd0 == null ||
      atr == null || ema200 == null || avgVol == null || volNow == null) {
    return null;
  }

  // ── Entry: MACD bullish cross (previous bar) + price above EMA200 trend filter
  // ago=1 vs ago=2 reads two CLOSED bars — safe in backtest and live
  const macdCrossUp = macd2.macd <= macd2.signal && macd1.macd > macd1.signal;
  const trendUp = ctx.price > ema200;
  const volConfirm = volNow > avgVol * 0.8; // allow slightly below-avg if still healthy

  if (!ctx.position && macdCrossUp && trendUp && volConfirm) {
    // ATR-based position sizing: risk 2% of cash per trade
    const riskAmt = ctx.cash * 0.02;
    const stopDist = atr * 2; // 2× ATR stop distance
    if (stopDist <= 0) return null;
    const qty = riskAmt / stopDist;
    // ATR trailing stop price (set on entry, updated each bar)
    const stopPx = ctx.price - stopDist;
    return {
      side: 'buy',
      qty: qty,
      // Store stop in order metadata so exit logic can read it
      postOnly: false,
      // ATR stop encoded in price field via comment hack — we'll handle via position tracking
    };
  }

  // ── Exit: if in position, manage with ATR trailing stop
  if (ctx.position > 0) {
    // Compute current ATR stop: price - 2×ATR, but only trail upward
    const trailStop = ctx.price - atr * 2;

    // Read previous bar's stored trail stop from position metadata
    // We track it in ctx.state or by using a closure variable approach
    // Since ctx.state persists, use it to store the best stop seen
    const prevBest = ctx.state.trailStop || (ctx.price - atr * 2);

    // Trail: only move stop UP (never down)
    const bestStop = Math.max(prevBest, trailStop);

    // Update stored best stop for next bar
    ctx.state.trailStop = bestStop;

    // Exit if MACD crosses down (ago=1 vs ago=2)
    const macdCrossDn = macd2.macd >= macd2.signal && macd1.macd < macd1.signal;

    // Stop hit: current price drops below best stop
    const stopHit = ctx.price < bestStop;

    if (macdCrossDn || stopHit) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
