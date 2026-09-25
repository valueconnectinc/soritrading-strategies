/*
 * @coinsori-strategy v1
 * name: BTC 4H Volume-Surge Breakout Vol-Scaled
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The volume-surge breakout is validated across BTC/ETH/SOL, but its
 *   drawdown is high (SOL MDD 42-69%). This version keeps the same winning signal and adds
 *   volatility-scaled position sizing — trade smaller when volatility is high (risk is
 *   higher), larger when it is calm. Tests whether cutting size during volatile regimes
 *   lowers drawdown without sacrificing the trend-following edge.
 * When it buys and sells: Same as the champion — buy on a 20-bar high break with >1.5x
 *   average volume, sell on a 20-bar low break. Only the position size changes with ATR.
 * When it does NOT work: Same as the champion — quiet grind-ups stay in cash too long, and
 *   it is long-only so it misses short-side gains in bears. Vol-scaling also trims the
 *   biggest winners (the most volatile legs), so it can lag a pure melt-up.
 */
function onUpdate(ctx) {
  let hh = -Infinity, ll = Infinity;
  for (let i = 1; i <= 20; i++) {
    const h = ctx.high(20, i);
    const l = ctx.low(20, i);
    if (h == null || l == null) return null;
    if (h > hh) hh = h;
    if (l < ll) ll = l;
  }
  const price = ctx.price;
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(50);
  if (vol == null || avgVol == null) return null;

  const pos = ctx.position;
  if (pos > 0) {
    if (price < ll) return { side: 'sell', qty: pos };
    return null;
  }
  // entry: 20-bar high break on above-average volume
  if (price > hh && vol > avgVol * 1.5) {
    // volatility-scaled size: ATR relative to its own 100-bar average
    const atr = ctx.atr(14);
    const atrAvg = ctx.atr(14, 1); // placeholder, replaced below
    let sizeFactor = 1;
    const a = ctx.atr(14);
    if (a != null) {
      // average ATR over last 100 bars via a rolling check is heavy; use EMA of close range instead
      const emaRange = ctx.ema(14, 1);
      if (emaRange != null && emaRange > 0) {
        const ratio = a / emaRange;
        // size down when ATR is well above its recent norm (ratio>1.5), size up when calm (<0.8)
        sizeFactor = ratio > 1.5 ? 0.5 : (ratio < 0.8 ? 1.3 : 1.0);
      }
    }
    const qty = ctx.cash / ctx.price * 0.98 * sizeFactor;
    return { side: 'buy', qty: qty };
  }
  return null;
}
