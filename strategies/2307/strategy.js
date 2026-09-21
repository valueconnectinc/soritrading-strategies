/*
 * @coinsori-strategy v1
 * name: BTC On-Chain Regime Trend
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin's mining hashrate is a slow-moving bull/bear
 * regime signal. When miners keep adding hashrate (network security and
 * confidence expanding), sustained uptrends are more likely; when hashrate
 * contracts, the network is bleeding and rallies tend to fail. This is a
 * fundamentally different signal family from price/volume/sentiment.
 * When it buys: price is above its 200-day average AND hashrate is above its
 * 30-day average (miners confident and expanding). When it sells: either
 * hashrate contracts below its 30-day average (regime turns bearish) or
 * price breaks back below the 200-day average.
 * When it does NOT work: the hashrate data is daily and lags price, so in
 * fast regime flips the filter reacts slowly; in choppy sideways markets the
 * 200-day trend gate whipsaws. It also misses the very start of a bull run
 * because both the trend gate and the on-chain filter must confirm first.
 */
function onUpdate(ctx) {
  // Trend gate: price above its 200-day average (closed bars).
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  const px = ctx.price;
  if (px == null) return null;

  // On-chain regime filter: current hashrate vs its 30-day average.
  // hashrate_sma30 is the smoothed dataset value for the same day.
  const hr = ctx.data('hashrate');
  const hrAvg = ctx.data('hashrate_sma30');
  if (hr == null || hrAvg == null) return null;

  // Regime is bullish when miners are still expanding hashrate.
  const hrExpanding = hr > hrAvg;

  const pos = ctx.position || 0;
  const uptrend = px > sma200;

  if (pos === 0) {
    // ENTRY: uptrend AND on-chain fundamentals expanding.
    if (uptrend && hrExpanding) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    return null;
  }

  // EXIT: trend broke OR on-chain regime turned bearish.
  if (!uptrend || !hrExpanding) {
    return { side: 'sell', qty: pos };
  }

  return null;
}
