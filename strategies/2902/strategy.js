/*
 * @coinsori-strategy v1
 * name: Fear-Greed Contrarian BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: A contrarian sentiment family — different from the momentum and
 * mean-reversion families already built. The Crypto Fear & Greed index measures crowd
 * emotion (0=extreme fear, 100=extreme greed). Crowds are systematically wrong at the
 * extremes: deep fear marks capitulation bottoms, euphoric greed marks blow-off tops.
 * This strategy buys only when fear is extreme AND price is below its 200-day average
 * (a real capitulation, not a dip in an uptrend), and exits when greed becomes extreme.
 * When it buys and sells: BUY when fear_greed < 20 and price < 200-day average (extreme
 * fear + downtrend = capitulation). SELL everything when fear_greed > 80 (extreme greed
 * = bubble exit). Between extremes it holds.
 * When it does NOT work: in a strong uptrend that never prints deep fear, it sits in
 * cash and misses the whole move; in a grinding bear market that stays in the 20-80
 * range it never buys the bottom. It only profits when sentiment swings to the poles.
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
    // Exit only at extreme greed — let the position ride the recovery, don't overtrade.
    if (fg > 80) return { side: 'sell', qty: pos };
    return null;
  }
  // Buy only at extreme fear during a downtrend (capitulation, not a bull dip).
  if (fg < 20 && price < sma200) {
    return { side: 'buy', qty: ctx.cash / price * 0.95 };
  }
  return null;
}
