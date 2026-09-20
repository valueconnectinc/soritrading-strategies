/*
 * @coinsori-strategy v1
 * name: DOGE Long-Term Trend Ride 4H
 * ex: binance
 * syms: DOGEUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The 200-SMA long-term trend ride proved robust on ETH
 * across long 5000-bar windows. DOGE just failed catastrophically on mean
 * reversion (-64/-87/-72%) on the same windows, so this tests whether the slow
 * trend filter rescues DOGE — a high-volatility alt where tight timing fails.
 * When it buys and sells: buy on a 4h close above the 200-SMA, hold while above
 * it, sell on a close back below the 200-SMA.
 * When it does NOT work: in a long flat/choppy market oscillating around the
 * 200-SMA it whipsaws; high-vol assets give back more of each trend because the
 * exits lag.
 */
function onUpdate(ctx) {
  const sma = ctx.sma(200, 1);
  const smaP = ctx.sma(200, 2);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  const closePrev2 = ctx.closes[ctx.closes.length - 3];
  if (sma == null || smaP == null || closePrev == null || closePrev2 == null) return null;

  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;

  if (pos <= 0) {
    if (closePrev2 <= smaP && closePrev > sma) {
      return { side: 'buy', qty: (cash / price) * 0.98 };
    }
    return null;
  } else {
    if (closePrev < sma) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
