/*
 * @coinsori-strategy v1
 * name: DOGE Donchian Daily Breakout 55/30
 * ex: binance
 * syms: DOGEUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: generalization test of the pure Donchian 55/30 daily breakout
 * (the job's second champion family, validated on BTC/ETH) on DOGE. Buys new 55-day
 * highs, exits on 30-day lows, full capital, lets winners run.
 * When it buys and sells: long when close breaks above the prior 55-day high; sell
 * when close drops below the prior 30-day low.
 * When it does NOT work: whipsaws hard in DOGE's choppy pullbacks, high MDD, holds
 * through deep drawdowns inside a trend. Not a crash-protection strategy.
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
