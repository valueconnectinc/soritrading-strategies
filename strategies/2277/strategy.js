/*
 * @coinsori-strategy v1
 * name: BTC Fear-Greed Mean Reversion 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the Crypto Fear & Greed Index is a contrarian sentiment gauge —
 * markets are most buyable at extreme fear and most dangerous at extreme greed.
 * This family is the opposite of the trend-following champion and is untested in
 * this job. It buys panics and sells recoveries.
 * When it buys and sells: buy when the index drops to extreme fear (<=25); sell when
 * it recovers to neutral (>=55) or if price falls hard below entry (crash stop).
 * When it does NOT work: in a persistent multi-year bear, extreme fear keeps getting
 * more extreme and the crash stop repeatedly cuts losses; and the index can stay
 * pinned at extreme fear for a long time (few trades).
 */
function onUpdate(ctx) {
  const fg = ctx.data('fg');
  const price = ctx.price;
  const atr = ctx.atr(14, 1);
  const pos = ctx.position;
  const entryPx = ctx.entryPx;
  if (fg == null || price == null || atr == null) return null;

  // Fear & Greed index: 0 (extreme fear) to 100 (extreme greed)
  if (pos <= 0) {
    // buy only at extreme fear (<=25) — contrarian entry into a panic
    if (fg <= 25) {
      return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
    }
    return null;
  } else {
    // exit on recovery to neutral (>=55) or a 3xATR crash below entry
    if (fg >= 55) {
      return { side: 'sell', qty: pos };
    }
    if (entryPx != null && price < entryPx - 3.0 * atr) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
