/*
 * @coinsori-strategy v1
 * name: BTC Trend-Filtered Dip Buy 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: In a confirmed uptrend, sharp dips on BTC tend to get
 * bought back up. Going long only when the trend is up avoids the whipsaw of
 * buying falling knives in downtrends.
 * When it buys and sells: it buys when price dips to the lower Bollinger band
 * with RSI oversold, but ONLY while price is above the long EMA trend line.
 * It sells when price recovers to the middle band, or if the trend breaks.
 * When it does NOT work: in a long sideways market there is no clear trend, so
 * few trades fire; and in a slow grind-up that never dips to the band, it sits
 * in cash and misses the rally.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const emaTrend = ctx.ema(100, 1); // medium trend filter: not too tight, not too loose
  if (bb == null || rsi == null || emaTrend == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos <= 0) {
    // only buy in an uptrend (price above the long EMA)
    if (price > emaTrend && price <= bb.lower && rsi < 35) {
      return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
    }
    return null;
  } else {
    // exit: price recovered to the middle band, OR the trend broke down
    if (price >= bb.mid || price < emaTrend) {
      return { side: 'sell', qty: pos };
    }
    // hard stop below entry to cap a bad dip
    if (ctx.entryPx && price <= ctx.entryPx * 0.92) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
