/*
 * @coinsori-strategy v1
 * name: BTC On-Chain Regime Trend v2
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin's mining hashrate is a slow bull/bear regime
 * signal, but the raw hashrate-vs-its-own-average cross flips too often and
 * causes overtrading. This version adds a hysteresis band so the regime only
 * turns bullish when hashrate clearly expands (+5% above its 30-day average)
 * and only turns bearish when it clearly contracts (-5% below), cutting the
 * churn that sank the v1 filter.
 * When it buys: price above its 200-day average AND hashrate is clearly
 * expanding (+5% over its 30-day average). When it sells: hashrate clearly
 * contracts (-5% under average) OR price breaks below the 200-day average.
 * When it does NOT work: hashrate is daily and lags price, so in fast regime
 * flips the filter reacts slowly; in choppy sideways markets the 200-day gate
 * still whipsaws. It misses the very start of a bull run because both the
 * trend gate and a clear on-chain expansion must confirm first.
 */
function onUpdate(ctx) {
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  const px = ctx.price;
  if (px == null) return null;

  const hr = ctx.data('hashrate');
  const hrAvg = ctx.data('hashrate_sma30');
  if (hr == null || hrAvg == null || hrAvg === 0) return null;

  // Hysteresis: regime only flips on a clear move, not on noise.
  // +5% expansion = bullish, -5% contraction = bearish. This single
  // threshold is the anti-overtrading fix for the v1 filter.
  const clearlyExpanding = hr > hrAvg * 1.05;
  const clearlyContracting = hr < hrAvg * 0.95;

  const pos = ctx.position || 0;
  const uptrend = px > sma200;

  if (pos === 0) {
    // ENTRY: uptrend AND on-chain clearly expanding.
    if (uptrend && clearlyExpanding) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    return null;
  }

  // EXIT: trend broke OR on-chain clearly contracting.
  if (!uptrend || clearlyContracting) {
    return { side: 'sell', qty: pos };
  }

  return null;
}
