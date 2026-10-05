/*
 * @coinsori-strategy v1
 * name: ADA 1D Defensive Donchian
 * ex: binance
 * syms: ADAUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The plain Donchian 55/30 breakout works on ADA but rides
 * volatile ADA down to its exit, giving 50-75% drawdowns. This defensive
 * variant adds a long-term trend filter so it never buys breakouts inside a
 * deep bear market — the recipe that generalized well on ETH 1d earlier.
 * When it buys and sells: buys when the daily close breaks above the 55-day
 * high AND price is above its 200-day average (no entries in deep bear
 * markets). Sells when the close breaks below the 30-day low.
 * When it does NOT work: sideways chop still whipsaws the breakout, and in a
 * straight melt-up it lags buy-and-hold. The SMA200 gate keeps it out of the
 * biggest crashes but can also make it miss the start of a new bull leg.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const hi55 = ctx.high(55, 1);
  const lo30 = ctx.low(30, 1);
  const sma200 = ctx.sma(200, 1);
  if (hi55 == null || lo30 == null || sma200 == null) return null;

  ctx.watch([
    { side: 'buy', price: hi55, note: '55d high breakout' },
    { side: 'sell', price: lo30, note: '30d low exit' }
  ]);

  const pos = ctx.position;
  if (pos > 0) {
    if (price < lo30) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Only buy breakouts when price is above its 200-day average (no deep-bear entries)
  if (price > hi55 && price > sma200) {
    return { side: 'buy', qty: (ctx.cash / price) * 0.99 };
  }
  return null;
}
