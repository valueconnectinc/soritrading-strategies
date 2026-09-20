/*
 * @coinsori-strategy v1
 * name: ETH Long-Term Trend Ride 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The mean-reversion family (BB+RSI dip-buy) proved overfit
 * to short windows and collapsed on multi-year horizons. A simple long-term
 * trend filter is the classic robust approach — it does not try to time short
 * dips, it just stays invested while the long-term trend is up and exits when
 * it turns down. Low frequency means low fee drag and no whipsaw on short noise.
 * When it buys and sells: buy on a 4h close above the 200-SMA, hold while
 * price stays above it, sell on a close back below the 200-SMA.
 * When it does NOT work: in a long flat/choppy market that oscillates around
 * the 200-SMA it whipsaws; it also gives back the last part of every trend
 * because it only exits after price has already fallen back through the SMA.
 * Two refinement attempts this job (rising-SMA slope entry, 50-SMA fast exit)
 * both regressed performance — the simple base is near-optimal for this family.
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
    // buy on a close crossing above the 200-SMA (use closed bars for stability)
    if (closePrev2 <= smaP && closePrev > sma) {
      return { side: 'buy', qty: (cash / price) * 0.98 };
    }
    return null;
  } else {
    // sell on a close crossing back below the 200-SMA
    if (closePrev < sma) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
