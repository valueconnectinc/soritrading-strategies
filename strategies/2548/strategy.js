/*
 * @coinsori-strategy v1
 * name: Volume-Confirmed Momentum Breakout BTC 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Momentum breakouts that come with a real surge in trading volume
 * (price breaking a 20-bar high on >1.5x average volume) tend to continue, while
 * low-volume breakouts are false and reverse. This is the opposite family to the
 * fear-contrarian champion — it rides confirmed moves instead of buying panic dips.
 * When it buys and sells: buys when price breaks the 20-bar high on above-average
 * volume; sells when price falls back below the 20-bar low. Position is
 * volatility-targeted so a 1-ATR adverse move costs ~1.5% of equity.
 * When it does NOT work: in tight chop a 20-bar high is hit often and the volume
 * filter is the only thing stopping whipsaw churn; in a slow grind-up with shrinking
 * volume it never gets a confirmed entry and misses the whole move.
 */
function onUpdate(ctx) {
  const atr = ctx.atr(14, 1);
  const avgVol = ctx.avgVol(20);
  if (atr == null || avgVol == null) return null;
  const price = ctx.price;

  // highest high / lowest low of the last 20 bars (excluding current)
  let hi = -Infinity, lo = Infinity;
  for (let k = 1; k <= 20; k++) {
    const h = ctx.high(1, k);
    const l = ctx.low(1, k);
    if (h == null || l == null) return null;
    if (h > hi) hi = h;
    if (l < lo) lo = l;
  }

  const pos = ctx.position;
  if (pos > 0) {
    if (price < lo) return { side: 'sell', qty: pos };
    return null;
  }

  const vol = ctx.vol;
  if (vol == null) return null;
  const volSurge = vol > avgVol * 1.5;

  // Volatility-targeted sizing: 1-ATR adverse move costs ~1.5% of equity.
  const riskBudget = 0.015;
  const volFrac = riskBudget / (atr / price);
  const qty = (ctx.cash / price) * Math.min(volFrac, 0.99);

  if (volSurge && price > hi) {
    return { side: 'buy', qty: qty };
  }
  return null;
}
