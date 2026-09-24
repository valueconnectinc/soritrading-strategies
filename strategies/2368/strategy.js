/*
 * @coinsori-strategy v1
 * name: BTC Regime-Switch Trend 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Crypto spends most time either trending above its 50-day
 * average (bull) or below it (bear). A simple regime switch — fully long in the
 * bull, flat in the bear, with a crash stop for sudden drops — captures the long
 * up-legs while sitting out the long down-legs. Low turnover means fees stay low.
 * When it buys and sells: Buy full when price closes above the 50-day average.
 * Sell full when price closes below the 50-day average, or if it falls more than
 * 3 ATRs below the average in a single move (crash stop).
 * When it does NOT work: In choppy sideways markets that flip around the 50-day
 * average repeatedly it whipsaws; and it misses the very start of a new bull
 * (it buys only after price is already above the average).
 */
function onUpdate(ctx) {
  const sma50 = ctx.sma(50, 1);
  const atr = ctx.atr(14, 1);
  const price = ctx.price;
  const pos = ctx.position;
  const cash = ctx.cash;
  if (sma50 == null || atr == null || price == null || price <= 0) return null;

  const long = price > sma50;
  const crashStop = price < sma50 - 3.0 * atr;

  if (pos === 0) {
    if (long && cash > 0) {
      return { side: 'buy', qty: (cash / price) * 0.98 };
    }
    return null;
  }

  // Exit on regime flip to bear or on a crash stop.
  if (!long || crashStop) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
