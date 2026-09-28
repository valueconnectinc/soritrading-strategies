/*
 * @coinsori-strategy v1
 * name: ETH 4H Chandelier Trend-Follow
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Crypto has long persistent up-trends that defensive
 * mean-reversion strategies miss because they sell into strength. This strategy
 * rides confirmed up-trends and only sells when the trend actually breaks, so
 * it captures the melt-up legs that cycle-1's Bollinger mean-reversion gives up.
 * When it buys and sells: it buys when price is above its 50-bar average and
 * that average is rising (a confirmed uptrend). It holds and trails a stop that
 * follows the highest high since entry down by 3 volatility units (ATR), selling
 * when price closes below that trailing stop.
 * When it does NOT work: in a choppy sideways market the 50-bar average whipsaws
 * and it buys late into fake breakouts, paying fees without progress. It also
 * gives back part of every crash because it only reacts after price closes
 * through the trailing stop.
 */
function onUpdate(ctx) {
  const ema = ctx.ema(50, 1);
  const emaPrev = ctx.ema(50, 2);
  const atr = ctx.atr(14, 1);
  const px = ctx.closes[ctx.closes.length - 2];
  if (ema == null || emaPrev == null || atr == null || px == null) return null;

  const rising = ema > emaPrev;

  // Exit: chandelier trailing stop (highest high since entry minus 3 ATR).
  if (ctx.position > 0) {
    const entry = ctx.entryPx || 0;
    // highest high since entry: use the max of entry and recent highs.
    let hh = entry;
    for (let k = 1; k <= 60; k++) {
      const h = ctx.high(1, k);
      if (h != null && h > hh) hh = h;
    }
    const stop = hh - 3 * atr;
    if (px < stop) return { side: 'sell', qty: ctx.position };
    return null;
  }

  // Enter only on a confirmed uptrend with price above the rising average.
  if (rising && px > ema) {
    // Risk 1% of equity on a 3-ATR stop loss -> volatility-scaled size.
    const equity = ctx.cash + ctx.position * ctx.price;
    const qty = Math.max(0, Math.min((equity * 0.01) / (3 * atr), (ctx.cash / ctx.price) * 0.99));
    if (qty > 0) return { side: 'buy', qty: qty };
  }
  return null;
}
