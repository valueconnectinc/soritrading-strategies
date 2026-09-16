/*
 * @coinsori-strategy v1
 * name: Multi-Asset Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT ETHUSDT SOLUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy bets on the mean-reverting behavior of multiple assets. By monitoring price deviations from moving averages across assets, it enters trades when one asset shows strong deviation from its historical average, suggesting a potential reversal.
 * When it buys and sells: It buys an asset when its price deviates significantly from its SMA20, and sells when it reverts toward the mean.
 * When it does NOT work: This strategy may fail in strong trending markets where assets do not revert to their mean, or in highly volatile periods with large spikes that are not true reversals.
 */

function onUpdate(ctx) {
  // Use ctx.sym for current symbol
  const sym = ctx.sym;
  const sma20 = ctx.sma(20);
  const bb = ctx.bb(20, 2);
  
  if (sma20 == null || bb == null) return null;

  // Calculate deviation from SMA20 in terms of standard deviations
  const price = ctx.price;
  const upper = bb.upper;
  const lower = bb.lower;
  const deviation = (price - sma20) / (upper - lower);

  // Buy condition: Price is significantly below its 20-period SMA (deviation < -1)
  if (deviation < -1 && ctx.position === 0) {
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }

  // Sell condition: Price is significantly above its 20-period SMA (deviation > 1)
  if (deviation > 1 && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
