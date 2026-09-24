/*
 * @coinsori-strategy v1
 * name: ETC Band-Bounce Mean Reversion TrendFilter 1D
 * ex: binance
 * syms: ETCUSDT
 * interval: 1d
 * cash: 1000
 *
 * Why this strategy: band-bounce mean reversion is the proven, repeatable edge
 * of this job (6 assets on 4h, LTC+ETC on 1D). Its one weakness is deep MDD in
 * sustained downtrends, where it keeps buying falling knives. This version adds
 * a long-term trend filter so it only buys bounces when price is above a long
 * SMA — an attempt to cut drawdown without losing the family's bear-market edge.
 * When it buys and sells: buys only when price closes at/below the lower Bollinger
 * band WITH RSI oversold AND price above the long SMA; sells when price returns to
 * the middle band or RSI turns overbought.
 * When it does NOT work: if the trend filter is too strict it misses the very bear
 * windows where the family makes its biggest returns, and it still buys knives in
 * fast crashes that take price below the SMA in one move.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2);
  if (bb == null) return null;

  const rsi = ctx.rsi(14);
  const rsi_1 = ctx.rsi(14, 1);
  if (rsi == null || rsi_1 == null) return null;

  // long-term trend filter: only buy when price is above the 100-day SMA
  const sma100 = ctx.sma(100);
  if (sma100 == null) return null;
  const uptrend = ctx.price > sma100;

  const lower = bb.lower;
  const mid = bb.mid;

  // BUY: at/below lower band AND RSI oversold AND price above long SMA
  const atLowerBand = ctx.price <= lower;
  const rsiOversold = rsi < 35;

  if (atLowerBand && rsiOversold && uptrend && ctx.position === 0) {
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
