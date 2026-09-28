/*
 * @coinsori-strategy v1
 * name: BTC 1D On-Chain Network-Health Trend (Hysteresis)
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin's mining network health (hashrate) reflects miner
 * confidence. A sustained growing network tends to accompany a rising price; a shrinking
 * network tends to precede weakness. This is a slow on-chain trend follower.
 * When it buys and sells: Buys only when hashrate is clearly above its 60-day average
 * (network growing by a margin) and fear/greed is not in extreme greed. Sells when
 * hashrate clearly drops below its 60-day average. A cooldown prevents trading too often.
 * When it does NOT work: It is slow and misses fast melt-ups; it can be late on sharp
 * reversals. It needs the external hashrate/fear-greed data — if missing it stays in cash.
 * It underperforms in sideways markets where hashrate hovers near its average.
 */
function onUpdate(ctx) {
  const hr = ctx.data('hashrate');
  const hrSma = ctx.data('hashrate_sma30');
  const fg = ctx.data('fear_greed');
  if (hr == null || hrSma == null || fg == null) return null;

  const price = ctx.price;
  if (price == null) return null;

  // Hysteresis: need a clear margin above/below the average to avoid whipsaw.
  // 3% buffer keeps us out of daily noise around the mean.
  const up = hr > hrSma * 1.03;
  const down = hr < hrSma * 0.97;

  // Cooldown: after any trade, wait 10 bars before acting again.
  const sinceTrade = ctx.state.lastTradeBar != null ? ctx.i - ctx.state.lastTradeBar : 999;
  if (sinceTrade < 10) return null;

  const notExtremeGreed = fg < 80;

  if (ctx.position <= 0) {
    if (up && notExtremeGreed) {
      ctx.state.lastTradeBar = ctx.i;
      return { side: 'buy', qty: (ctx.cash / price) * 0.99 };
    }
    return null;
  }

  if (down) {
    ctx.state.lastTradeBar = ctx.i;
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
