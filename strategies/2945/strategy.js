/*
 * @coinsori-strategy v1
 * name: BTC 1D On-Chain Network-Health Trend
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin's mining network health (hashrate) reflects miner confidence
 * and is a slow fundamental signal. When the network is growing, price tends to trend up.
 * When it shrinks, the market tends to weaken. This is a slow long-term trend follower
 * using on-chain data rather than price indicators.
 * When it buys and sells: Buys BTC when hashrate is above its 30-day average (network
 * growing) and fear/greed is not in extreme greed (below 80). Sells when hashrate drops
 * back below its 30-day average (network weakening).
 * When it does NOT work: It is slow — it misses fast melt-ups and can be late on sharp
 * reversals. It depends on the external hashrate and fear/greed data being available;
 * if they are missing (null) it stays in cash. It underperforms in choppy sideways
 * markets where hashrate oscillates around its average.
 */
function onUpdate(ctx) {
  // On-chain data (daily) — null means data unavailable; stay in cash (do not trade).
  const hr = ctx.data('hashrate');
  const hrSma = ctx.data('hashrate_sma30');
  const fg = ctx.data('fear_greed');
  if (hr == null || hrSma == null || fg == null) return null;

  const price = ctx.price;
  if (price == null) return null;

  // Network-health trend: hashrate above its 30-day average = growing network.
  const networkUp = hr > hrSma;

  // Sentiment filter: avoid buying into extreme greed (fg >= 80 = euphoric top risk).
  const notExtremeGreed = fg < 80;

  if (ctx.position <= 0) {
    if (networkUp && notExtremeGreed) {
      return { side: 'buy', qty: (ctx.cash / price) * 0.99 };
    }
    return null;
  }

  // Exit when the network weakens (hashrate falls back below its 30-day average).
  if (!networkUp) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
