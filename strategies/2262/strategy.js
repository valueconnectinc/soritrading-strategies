/*
 * @coinsori-strategy v1
 * name: DOGE Donchian Daily Breakout 55/30
 * ex: binance
 * syms: DOGEUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the Donchian 55-day entry / 30-day exit breakout validated strongly
 * on BTC and ETH 1d (positive in all walk-forward windows). This tests whether the same
 * edge generalizes to DOGE — a highly volatile meme coin. It buys new 55-day highs
 * (momentum breakout) and exits on a 30-day low, letting winners run.
 * When it buys and sells: long when today's close breaks above the highest high of the
 * prior 55 days; sell when the close drops below the lowest low of the prior 30 days.
 * When it does NOT work: DOGE is extremely whipsaw-prone; in choppy/sideways windows it
 * underperforms buy-and-hold and MDD is high. Not a crash-protection strategy.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 60) return null;

  const closePrev = closes[closes.length - 2];
  if (closePrev == null) return null;

  let entryHigh = -Infinity;
  for (let k = 2; k <= 56; k++) {
    const h = ctx.high(1, k);
    if (h == null) return null;
    if (h > entryHigh) entryHigh = h;
  }
  let exitLow = Infinity;
  for (let k = 2; k <= 31; k++) {
    const l = ctx.low(1, k);
    if (l == null) return null;
    if (l < exitLow) exitLow = l;
  }

  const pos = ctx.position;
  const price = ctx.price;

  if (pos <= 0) {
    if (closePrev > entryHigh) {
      return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
    }
    return null;
  } else {
    if (closePrev < exitLow) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
