/*
 * @coinsori-strategy v1
 * name: BTC Daily Donchian Wider Exit 40
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the core Donchian (55-day entry / 30-day exit) was
 * profitable in every window but underperformed buy-and-hold in strong bulls
 * because the 30-day exit exits too early on routine pullbacks, and then the
 * 55-day entry waits a long time to get back in. Widening the exit to a 40-day
 * low lets a real trend breathe through shallow pullbacks so we ride more of
 * the move. Same 55-day breakout entry, full capital.
 * When it buys and sells: buy with full cash when the daily close breaks above
 * the 55-day high; sell everything when it breaks below the 40-day low.
 * When it does NOT work: a wider exit means we give back more on sharp
 * corrections and take deeper drawdowns in choppy markets. It still misses the
 * very first leg of a new bull until a 55-day high is made.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;

  const entryHigh = ctx.high(55, 1);
  if (entryHigh == null) return null;
  const exitLow = ctx.low(40, 1);
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
