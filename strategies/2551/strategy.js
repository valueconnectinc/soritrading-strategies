/*
 * @coinsori-strategy v1
 * name: EMA-Stack Trend Ride with Vol Filter BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: A slow daily trend-ride that only stays long when the short
 * EMAs are stacked above the long ones (20>50>200) — a clean uptrend. A volatility
 * filter (ATR not spiking to its 90th percentile) keeps it out of violent crash
 * chop where trends break. This is a different timeframe and structure from the 4h
 * fear-contrarian champion: no fear data, no Bollinger, just a disciplined ride of
 * confirmed daily uptrends.
 * When it buys and sells: buys when 20-EMA > 50-EMA > 200-EMA (full stack) and ATR is
 * not in its top 10%; sells when the stack breaks (20-EMA falls below 50-EMA).
 * Position is volatility-targeted so a 1-ATR adverse move costs ~1.5% of equity.
 * When it does NOT work: in a long sideways range the stack toggles on and off,
 * whipsawing trades; it misses V-shaped recoveries where price jumps straight back
 * above the stack without the EMAs re-stacking cleanly; it sits in cash through the
 * early, most explosive part of a new bull run.
 */
function onUpdate(ctx) {
  const e20 = ctx.ema(20, 1);
  const e50 = ctx.ema(50, 1);
  const e200 = ctx.ema(200, 1);
  const atr = ctx.atr(14, 1);
  if (e20 == null || e50 == null || e200 == null || atr == null) return null;
  const price = ctx.price;

  // ATR percentile over last 100 bars — is volatility spiking (crash chop)?
  const atrNow = atr;
  let below = 0, counted = 0;
  for (let k = 1; k <= 100; k++) {
    const a = ctx.atr(14, k);
    if (a == null) continue;
    if (a < atrNow) below++;
    counted++;
  }
  if (counted < 40) return null;
  const volSpike = below / counted > 0.90;

  const pos = ctx.position;
  if (pos > 0) {
    if (e20 < e50) return { side: 'sell', qty: pos };
    return null;
  }

  const stacked = e20 > e50 && e50 > e200;
  if (!stacked || volSpike) return null;

  // Volatility-targeted sizing: 1-ATR adverse move costs ~1.5% of equity.
  const riskBudget = 0.015;
  const volFrac = riskBudget / (atr / price);
  const qty = (ctx.cash / price) * Math.min(volFrac, 0.99);

  return { side: 'buy', qty: qty };
}
