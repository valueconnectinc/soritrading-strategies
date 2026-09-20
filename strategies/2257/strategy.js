/*
 * @coinsori-strategy v1
 * name: BTC Donchian Daily Breakout 55/30
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the ledger (exp 547) found a 55-day entry / 30-day exit Donchian
 * channel breakout is consistently profitable on BTC and ETH daily — positive in all 6
 * walk-forward windows, beating buy-and-hold in the 2018-22 bull (+367% vs +263% on BTC).
 * This is a genuinely different trend-following mechanism from the SMA200 ride: it buys
 * new 55-day highs (momentum breakout) and exits on a 30-day low, letting winners run.
 * When it buys and sells: long when today's close breaks above the highest high of the
 * prior 55 days; sell when the close drops below the lowest low of the prior 30 days.
 * When it does NOT work: underperforms buy-and-hold in choppy/sideways windows and MDD
 * is high (43-58%) — it holds through deep pullbacks inside a trend and whipsaws in
 * range markets. Not a crash-protection strategy.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  const i = ctx.i;
  if (closes == null || closes.length < 60) return null;

  // Entry needs the prior 55 highs; exit needs prior 30 lows. Use closed bars (ago>=1).
  const closePrev = closes[closes.length - 2];
  if (closePrev == null) return null;

  // Highest high of prior 55 closed bars (excluding current).
  let entryHigh = -Infinity;
  for (let k = 2; k <= 56; k++) {
    const h = ctx.high(1, k);
    if (h == null) return null;
    if (h > entryHigh) entryHigh = h;
  }
  // Lowest low of prior 30 closed bars.
  let exitLow = Infinity;
  for (let k = 2; k <= 31; k++) {
    const l = ctx.low(1, k);
    if (l == null) return null;
    if (l < exitLow) exitLow = l;
  }

  const pos = ctx.position;
  const price = ctx.price;

  if (pos <= 0) {
    // Buy on a close breaking above the 55-day high.
    if (closePrev > entryHigh) {
      return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
    }
    return null;
  } else {
    // Exit on a close below the 30-day low.
    if (closePrev < exitLow) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
