/*
 * @coinsori-strategy v1
 * name: Fear-Greed Contrarian w/ Trend-Exit BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: A contrarian sentiment family. The Crypto Fear & Greed index
 * measures crowd emotion (0=extreme fear, 100=extreme greed), and crowds are
 * systematically wrong at the extremes. It buys only at extreme fear below the 200-day
 * average (capitulation) and exits when greed turns extreme OR when the recovery
 * stalls and price falls back below the 200-day average (trend broken) — the trend
 * exit cuts the long drawdowns of the pure fear->greed hold, so it does not give back
 * the whole recovery when the bounce fails.
 * When it buys and sells: BUY when fear_greed < 20 and price < 200-day average.
 * SELL when fear_greed > 80 (bubble exit) OR price falls back below the 200-day
 * average (failed recovery / trend broken).
 * When it does NOT work: in a strong uptrend that never prints deep fear it sits in
 * cash and misses the whole move; in a grinding bear that stays in the 20-80 range it
 * never buys the bottom. It only profits when sentiment swings to the poles.
 */
function onUpdate(ctx) {
  const fg = ctx.data('fear_greed');
  const pos = ctx.position;
  const price = ctx.price;
  if (fg == null) return null;                     // no sentiment data yet — wait
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;

  if (pos > 0) {
    // Exit on extreme greed (bubble) OR a broken 200-day trend (failed recovery).
    // The trend exit is what keeps MDD low — don't ride a failed bounce to the bottom.
    if (fg > 80 || price < sma200) return { side: 'sell', qty: pos };
    return null;
  }
  // Buy only at extreme fear during a downtrend (capitulation, not a bull dip).
  if (fg < 20 && price < sma200) {
    return { side: 'buy', qty: ctx.cash / price * 0.95 };
  }
  return null;
}
