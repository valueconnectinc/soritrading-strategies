/*
 * @coinsori-strategy v1
 * name: BTC 1D Long-Term SMA100 Trend (upbit)
 * ex: upbit
 * syms: BTC
 * interval: 1d
 * cash: 10000000
 *
 * Why this strategy: The simplest long-term trend filter. Stay fully invested
 * while price is above the 100-day average (capturing the bull), and exit to
 * cash when price closes below it (avoiding the bear). No short-term cross to
 * whipsaw — just one slow line that separates bull from bear.
 * When it buys and sells: Buy when price closes above the 100-day average.
 * Sell when price closes below the 100-day average.
 * When it does NOT work: In a choppy sideways market price crosses the 100-day
 * line repeatedly and whipsaws; it also gives back a chunk of a crash before the
 * slow line turns. It is long-only, so it sits in cash through a sustained bear.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma100 = ctx.sma(100, 1);
  if (sma100 == null) return null;

  if (pos > 0) {
    if (price < sma100) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (price > sma100) {
    return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
  }
  return null;
}
