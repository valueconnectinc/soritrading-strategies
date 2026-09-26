/*
 * @coinsori-strategy v1
 * name: RSI-Divergence Mean Reversion ALGO 4H
 * ex: binance
 * syms: ALGOUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: A distinct mean-reversion family from the Bollinger-band
 * champion. ALGO 4h bottoms often show a BULLISH DIVERGENCE: price makes a
 * lower low but RSI makes a higher low — the downside momentum is weakening
 * even as the price still falls. Buying that divergence catches the bottom
 * before the snap-back, without waiting for a full Bollinger-band flush.
 * When it buys and sells: buys when price is below its 10-bar-ago low but RSI
 * is above its 10-bar-ago low (bullish divergence) with RSI below 45, above
 * the 200-SMA; exits at the middle Bollinger band / RSI>55 or a 5-ATR stop,
 * then waits 5 bars before the next entry.
 * When it does NOT work: lags strong melt-ups (sits in cash during rallies);
 * in a sustained downtrend below the 200-SMA it never buys; a divergence that
 * keeps falling (weak bounce) still loses. Mean reversion is defensive.
 */
function onUpdate(ctx) {
  const rsiNow = ctx.rsi(14, 1);
  const rsiPrev = ctx.rsi(14, 10);
  const sma200 = ctx.sma(200, 1);
  const bb = ctx.bb(20, 2, 1);
  if (rsiNow == null || rsiPrev == null || sma200 == null || bb == null) return null;

  const price = ctx.price;
  // price low 1 bar ago vs price low 10 bars ago
  const lowNow = ctx.low(14, 1);   // recent low
  const lowPrev = ctx.low(14, 10); // older low
  if (lowNow == null || lowPrev == null) return null;

  const pos = ctx.position;

  if (pos > 0) {
    if (price >= bb.mid || rsiNow > 55) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    const atr = ctx.atr(14, 1);
    if (atr != null && price <= ctx.entryPx - atr * 5) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const lastExit = ctx.state.lastExit || 0;
  if (ctx.i - lastExit < 5) return null;

  if (price < sma200) return null;

  // bullish divergence: price makes lower low, RSI makes higher low
  if (lowNow < lowPrev && rsiNow > rsiPrev && rsiNow < 45) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
