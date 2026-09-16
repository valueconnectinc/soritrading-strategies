/*
 * @coinsori-strategy v1
 * name: Simple Multi-Asset Momentum Strategy
 * ex: binanceusdm
 * syms: BTCUSDT ETHUSDT SOLUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy leverages momentum across multiple assets to capture trending movements. It buys the asset with the highest momentum among BTC, ETH, and SOL.
 * When it buys and sells: It buys the asset with the highest momentum among BTC, ETH, and SOL when the market is trending up. It sells when momentum drops below threshold or a new high momentum asset emerges.
 * When it does NOT work: The strategy does not work when all assets are in downtrend or when short-term volatility makes momentum signals unreliable.
 */
function onUpdate(ctx) {
  // Compute momentum for each symbol (EMA ratio)
  const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
  let maxMomentum = -Infinity;
  let selectedSym = null;

  // Use EMA to compute momentum (12-period EMA vs 26-period EMA)
  for (const sym of symbols) {
    const ema12 = ctx.ema(12);
    const ema26 = ctx.ema(26);

    // Ensure we have valid EMA values
    if (ema12 == null || ema26 == null) {
      continue;
    }

    // Momentum is the ratio of short-term EMA to long-term EMA
    const momentum = ema12 / ema26;

    if (momentum > maxMomentum) {
      maxMomentum = momentum;
      selectedSym = sym;
    }
  }

  // If no valid symbol found, do nothing
  if (selectedSym == null) return null;

  // Only trade if momentum is significantly above average (e.g., above 1.0)
  const momentumThreshold = 1.0;
  if (maxMomentum < momentumThreshold) {
    return null;
  }

  // Close existing position if any
  if (ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }

  // Open new position on the asset with highest momentum
  const qty = ctx.cash / ctx.price * 0.95; // Trade with 95% of available cash
  return { side: 'buy', qty };
}
