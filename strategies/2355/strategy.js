/*
 * @coinsori-strategy v1
 * name: LTC Band-Bounce Mean Reversion 1D
 * ex: binance
 * syms: LTCUSDT
 * interval: 1d
 * cash: 1000
 *
 * Why this strategy: band-bounce mean reversion is the proven, repeatable edge
 * of this job — validated on LTC/XRP/DOT/ETC/LINK/ADA on the 4h timeframe, all
 * beating buy-and-hold on 3 disjoint windows. This tests whether the SAME signal
 * generalizes to the 1D timeframe on LTC (an asset already proven on 4h), to see
 * if the edge is timeframe-robust or 4h-specific.
 * When it buys and sells: buys when price closes at/below the lower Bollinger
 * band with RSI oversold; sells when price returns to the middle band or RSI
 * turns overbought.
 * When it does NOT work: in strong trending moves where price hugs the outer band
 * for long stretches (it keeps buying falling knives); and possibly on 1D if the
 * intraday mean-reversion pull is not strong enough at daily resolution.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2);
  if (bb == null) return null;

  const rsi = ctx.rsi(14);
  const rsi_1 = ctx.rsi(14, 1);
  if (rsi == null || rsi_1 == null) return null;

  const lower = bb.lower;
  const mid = bb.mid;

  // BUY: price at/below lower band AND RSI oversold
  const atLowerBand = ctx.price <= lower;
  const rsiOversold = rsi < 35;

  if (atLowerBand && rsiOversold && ctx.position === 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // SELL: price at/above middle band OR RSI turns overbought
  const atMidBand = ctx.price >= mid;
  const rsiOverbought = rsi > 65 && rsi_1 <= 65;

  if ((atMidBand || rsiOverbought) && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
