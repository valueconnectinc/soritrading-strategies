/*
 * @coinsori-strategy v1
 * name: Daily Donchian Breakout Trend
 * ex: binance
 * syms: DOGEUSDT, XRPUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Crypto trends often run for weeks in one direction. A wide
 * Donchian channel (55-day high entry / 30-day low exit) catches those sustained
 * moves and sits in cash during chop, avoiding constant whipsaw.
 * When it buys and sells: Buy when price breaks above the highest high of the last
 * 55 days (a fresh multi-week breakout). Sell when price falls below the lowest low
 * of the last 30 days (the trend has broken down). Otherwise stay in cash.
 * When it does NOT work: In long sideways/choppy markets with no real trend it can
 * give back gains and take deep drawdowns; it also lags buy-and-hold in steady
 * grind-up bull markets because it waits for fresh breakouts.
 */
function onUpdate(ctx) {
  const entry = 55, exit = 30;
  const px = ctx.price;
  if (px == null) return null;
  const hi = ctx.high(entry, 1);   // highest high of last 55 closed bars
  const lo = ctx.low(exit, 1);     // lowest low of last 30 closed bars
  if (hi == null || lo == null) return null;

  if (ctx.position <= 0) {
    // Buy only on a fresh breakout above the 55-day high (closed bar, ago=1)
    if (px > hi) return { side: 'buy', qty: (ctx.cash / px) * 0.99 };
    return null;
  }
  // Exit when price closes below the 30-day low — trend broke down
  if (px < lo) return { side: 'sell', qty: ctx.position };
  return null;
}
