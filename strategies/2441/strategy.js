/*
 * @coinsori-strategy v1
 * name: BTC 4H Volume-Surge Trend-Gated Breakout
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The plain volume-surge breakout was promising but took false
 *   breakouts in choppy/bear regimes (MDD 22-44%). Adding a long-term trend gate
 *   (price above the 200-bar EMA) should keep only breakouts that start from an
 *   established uptrend, cutting the drawdown without losing the real moves.
 * When it buys and sells: Buy when price closes above the 20-bar high AND volume is
 *   above 1.5x its 50-bar average AND price is above the 200-bar EMA. Sell when price
 *   closes below the 20-bar low.
 * When it does NOT work: Quiet grind-up markets never trigger the volume filter (stays
 *   in cash too long). Long-only, so it misses short-side gains in bear markets. The
 *   trend gate also means it sits out early-stage reversals that start below the EMA.
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
  const ema200 = ctx.ema(200, 1); // closed-bar trend gate, avoids the still-forming bar
  if (vol == null || avgVol == null || ema200 == null) return null;

  const pos = ctx.position;
  if (pos > 0) {
    if (price < ll) return { side: 'sell', qty: pos };
    return null;
  }
  // entry: 20-bar high break, above-average volume, AND uptrend confirmed by EMA200
  if (price > hh && vol > avgVol * 1.5 && price > ema200) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
