/*
 * @coinsori-strategy v1
 * name: BTC Daily Donchian Trend Ride
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: crypto's biggest gains come from long, sustained trends
 * (bull runs lasting months). A Donchian channel breakout on DAILY bars catches
 * the start of these trends and holds them, while daily bars mean very few
 * trades so fees don't eat the profit. This is the classic "turtle" trend
 * following idea, and it does NOT try to predict tops or bottoms. We deploy
 * FULL capital on a breakout (the exit stop is the 20-day low, not a tight
 * price stop), so we capture the whole trend instead of a fraction of it.
 * When it buys and sells: buy with full cash when the daily close breaks above
 * the highest close of the last 55 days; sell everything when it breaks below
 * the lowest close of the last 20 days (a tighter exit so we give back less).
 * When it does NOT work: in a long sideways / choppy market with no sustained
 * trend, it buys breakouts that immediately reverse (small losses). It also
 * gives back a chunk of gains on sharp corrections because it only exits on a
 * 20-day low break.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;

  // Donchian entry: close above the highest close of the last 55 days
  const entryHigh = ctx.high(55, 1);
  if (entryHigh == null) return null;
  const exitLow = ctx.low(20, 1);
  if (exitLow == null) return null;

  if (pos <= 0) {
    // buy with full cash when today's close breaks above the 55-day high
    if (price > entryHigh) {
      return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
    }
    return null;
  } else {
    // exit when price breaks below the 20-day low
    if (price < exitLow) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
