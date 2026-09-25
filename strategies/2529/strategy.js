/*
 * @coinsori-strategy v1
 * name: BTC 1D Donchian Breakout VolTargeted
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The job's champion is a mean-reversion-heavy hybrid whose
 * documented weakness is lagging bull melt-ups (it sits in cash through fast
 * rallies). Donchian breakout is the OPPOSITE family — it buys a fresh 20-day
 * high and rides the new trend, so it captures exactly the melt-ups the champion
 * misses. This is a pure momentum/trend-following strategy, a different family.
 * When it buys and sells: Buy when the daily close makes a new 20-day high (vs the
 * previous 20 closes). Sell when the close makes a new 10-day low (trend broke) or
 * on a 25% trailing stop. Position size is ATR vol-targeted (inverse ATR) so
 * high-volatility blow-offs take smaller positions, controlling drawdown.
 * When it does NOT work: In choppy sideways ranges breakouts whipsaw and churn
 * fees. It buys extended tops late in a run and can give back gains on sharp
 * reversals before the 10-day-low exit triggers. It underperforms in bear markets
 * (it buys breakdowns' false rallies).
 */
function onUpdate(ctx) {
  const atr = ctx.atr(14, 1);
  // 20-day high = highest close of the previous 20 bars (exclude current)
  let hi20 = null;
  for (let i = 1; i <= 20; i++) {
    const c = ctx.closes[ctx.closes.length - 1 - i];
    if (c == null) return null;
    if (hi20 == null || c > hi20) hi20 = c;
  }
  // 10-day low = lowest close of the previous 10 bars
  let lo10 = null;
  for (let i = 1; i <= 10; i++) {
    const c = ctx.closes[ctx.closes.length - 1 - i];
    if (c == null) return null;
    if (lo10 == null || c < lo10) lo10 = c;
  }
  if (atr == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    // trailing stop: 25% below entry, or trend broke to a 10-day low
    if (price < ctx.entryPx * 0.75) return { side: 'sell', qty: pos };
    if (price < lo10) return { side: 'sell', qty: pos };
    return null;
  }

  // ATR vol-targeted size: a 1-ATR adverse move should cost ~1.5% of equity.
  // On BTC 1d atr/price is ~2-5%, giving near-full size in calm periods and a
  // fraction in high-volatility blow-offs. Same lever that fixed the champion.
  const riskBudget = 0.015;
  const volFrac = riskBudget / (atr / price);
  const qty = (ctx.cash / price) * Math.min(volFrac, 0.99);

  // fresh 20-day high breakout
  if (price > hi20) {
    return { side: 'buy', qty: qty };
  }
  return null;
}
