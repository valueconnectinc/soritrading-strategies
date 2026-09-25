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
 *   above or below its long-term average — trend-follow in bull markets,
 *   mean-revert in bear/range markets.
 * When it buys and sells: Above the 100-bar EMA (bull) it buys pullbacks toward
 *   the EMA and sells when price breaks back below it. Below the EMA (bear/range)
 *   it buys oversold bounces (RSI crossing up from <=30) and sells on the bounce
 *   back to the EMA.
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

  // ---- BULL regime: trend-follow on pullbacks to the EMA ----
  if (bull) {
    if (pos > 0) {
      // exit: price closes back below the EMA (trend broke)
      if (price < ema) return { side: 'sell', qty: pos };
      return null;
    }
    // entry: price pulled back near the EMA then turned back up
    const prevPx = ctx.closes[ctx.closes.length - 2];
    const prevEma = ctx.ema(100, 2);
    if (prevEma == null) return null;
    const wasBelow = prevPx < prevEma;
    const nowAbove = price > ema;
    if (wasBelow && nowAbove && price > ema * 0.99) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
    }
    return null;
  }

  // ---- BEAR/RANGE regime: mean-reversion on oversold bounces ----
  if (pos > 0) {
    // exit: price bounced back up to the EMA (mean reversion target reached)
    if (price > ema) return { side: 'sell', qty: pos };
    // hard stop: price keeps falling away (falling knife)
    if (price < ctx.entryPx * 0.92) return { side: 'sell', qty: pos };
    return null;
  }
  const rsiNow = ctx.rsi(14, 1);
  const rsiPrev = ctx.rsi(14, 2);
  if (rsiNow == null || rsiPrev == null) return null;
  // entry: RSI crossed up from oversold (<=30)
  if (rsiPrev <= 30 && rsiNow > 30) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
