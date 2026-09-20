/*
 * @coinsori-strategy v1
 * name: BTC Daily Donchian Core 55/30
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: crypto's biggest gains come from long sustained trends
 * (bull runs lasting months). A Donchian channel breakout on DAILY bars catches
 * the start of these trends and holds them; daily bars mean very few trades so
 * fees don't eat profits. This is the classic turtle trend-following idea and
 * does not try to predict tops or bottoms. Full capital on a breakout, exit on
 * the 30-day low.
 * When it buys and sells: buy with full cash when the daily close breaks above
 * the 55-day high; sell everything when it breaks below the 30-day low.
 * When it does NOT work: in a long sideways/choppy market it buys breakouts
 * that immediately reverse. It gives back gains on sharp corrections because
 * it only exits on a 30-day low break.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;

  const entryHigh = ctx.high(55, 1);
  if (entryHigh == null) return null;
  const exitLow = ctx.low(30, 1);
  if (exitLow == null) return null;

  if (pos <= 0) {
    if (price > entryHigh) {
      return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
    }
    return null;
  } else {
    if (price < exitLow) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
