/*
 * @coinsori-strategy v1
 * name: ETC Band-Bounce Mean Reversion TrendFilter50 1D
 * ex: binance
 * syms: ETCUSDT
 * interval: 1d
 * cash: 1000
 *
 * Why this strategy: the SMA100 trend filter was too strict — it cut trade count
 * to 2 in recent windows and collapsed returns from +1153% to ~+20% in 2022-26,
 * because the family's edge IS the bear-market bounce. This uses a faster SMA50
 * trend filter: less restrictive, still skips the deepest falling-knife regimes.
 * When it buys and sells: buys only when price closes at/below the lower Bollinger
 * band WITH RSI oversold AND price above the 50-day SMA; sells when price returns
 * to the middle band or RSI turns overbought.
 * When it does NOT work: if SMA50 is still too strict it repeats the SMA100 failure;
 * if too loose it keeps the deep MDD of the unfiltered version.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2);
  if (bb == null) return null;

  const rsi = ctx.rsi(14);
  const rsi_1 = ctx.rsi(14, 1);
  if (rsi == null || rsi_1 == null) return null;

  // faster trend filter: only buy when price is above the 50-day SMA
  const sma50 = ctx.sma(50);
  if (sma50 == null) return null;
  const uptrend = ctx.price > sma50;

  const lower = bb.lower;
  const mid = bb.mid;

  // BUY: at/below lower band AND RSI oversold AND price above 50-day SMA
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
