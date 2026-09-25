/*
 * @coinsori-strategy v1
 * name: BTC 4H Regime-Switching Trend/Revert
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Pure trend-following lags in chop and pure mean-reversion
 *   gets stopped out in trending bulls. Each approach only works in its own
 *   regime, so this strategy switches between them based on whether price is
 *   above or below its long-term average — breakout-follow in bull markets,
 *   mean-revert in bear/range markets.
 * When it buys and sells: Above the 100-bar EMA (bull) it buys 20-bar-high
 *   breakouts and sells on 20-bar-low breaks. Below the EMA (bear/range) it
 *   buys oversold bounces (RSI dipping to <=35 and turning up) and sells when
 *   price bounces back to the EMA or drops 8% from entry.
 * When it does NOT work: Regime flips near the EMA create whipsaw as the two
 *   modes fight. Long-only, so it misses short-side gains in sustained bears.
 *   Mean-reversion leg can still catch a falling knife in a violent crash.
 */
function onUpdate(ctx) {
  const ema = ctx.ema(100, 1);
  const price = ctx.price;
  if (ema == null) return null;

  const pos = ctx.position;
  const bull = price > ema;

  // 20-bar channel for the bull breakout leg
  let hh = -Infinity, ll = Infinity;
  for (let i = 1; i <= 20; i++) {
    const h = ctx.high(20, i);
    const l = ctx.low(20, i);
    if (h == null || l == null) return null;
    if (h > hh) hh = h;
    if (l < ll) ll = l;
  }

  // ---- BULL regime: breakout-follow ----
  if (bull) {
    if (pos > 0) {
      if (price < ll) return { side: 'sell', qty: pos };
      return null;
    }
    if (price > hh) return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
    return null;
  }

  // ---- BEAR/RANGE regime: mean-reversion ----
  if (pos > 0) {
    // bounce target: price recovered back up to the EMA
    if (price > ema) return { side: 'sell', qty: pos };
    // falling knife stop: 8% below entry
    if (price < ctx.entryPx * 0.92) return { side: 'sell', qty: pos };
    return null;
  }
  const rsiNow = ctx.rsi(14, 1);
  const rsiPrev = ctx.rsi(14, 2);
  if (rsiNow == null || rsiPrev == null) return null;
  // entry: RSI turned up from oversold (<=35)
  if (rsiPrev <= 35 && rsiNow > 35) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
