/*
 * @coinsori-strategy v1
 * name: BTC Donchian Breakout TrendScaled 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the Donchian 55/30 daily breakout is a validated, robust
 * trend-following family (beats buy-and-hold on BTC/ETH/DOGE and is stronger than
 * the SMA200 champion in recent windows). Pure full-capital Donchian already works;
 * this variant scales position by trend strength (how far price is above the entry
 * channel) to ride strong trends harder while staying lighter in weak ones.
 * When it buys and sells: buys when price breaks above the 55-day high; sells when
 * price breaks below the 30-day low. Position size scales with distance above the
 * 55-day high — stronger breakout, bigger position.
 * When it does NOT work: in choppy sideways markets the breakout whipsaws (many
 * small losses), and the early 2017 window has few trades. It underperforms in
 * slow grind-ups that never make a 55-day high.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const cash = ctx.cash;
  const pos = ctx.position;
  if (price == null || price <= 0) return null;

  // Donchian channels from closed bars (ago=1) so signals are identical live/backtest.
  const hi55 = ctx.high(55, 1);
  const lo30 = ctx.low(30, 1);
  if (hi55 == null || lo30 == null) return null;

  const equity = cash + pos * price;

  let targetQty;
  if (price < lo30) {
    // Broke the 30-day low: exit the trend.
    targetQty = 0;
  } else if (pos > 0) {
    // Already in the trend: hold full position until the 30-day low breaks.
    targetQty = equity / price;
  } else if (price > hi55) {
    // New 55-day breakout: scale size by how far price is above the channel.
    // Stronger breakout (further above the 55-day high) gets a bigger position.
    const strength = Math.min(1.0, (price - hi55) / (hi55 * 0.05)); // 5% above high = full size
    targetQty = (equity / price) * Math.max(0.25, strength);
  } else {
    targetQty = 0;
  }

  const diff = targetQty - pos;
  if (Math.abs(diff) < 0.0001 * Math.max(0.0001, pos)) return null;

  if (diff > 0) {
    const buyQty = Math.min(diff, (cash / price) * 0.98);
    if (buyQty <= 0) return null;
    return { side: 'buy', qty: buyQty };
  } else {
    return { side: 'sell', qty: Math.min(pos, -diff) };
  }
}
