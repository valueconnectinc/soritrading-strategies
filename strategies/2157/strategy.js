/*
 * @coinsori-strategy v1
 * name: BTC Daily Donchian Trend Ride v3 (trend filter)
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the plain Donchian breakout (v2) was profitable in every
 * window but took deep drawdowns (43-58%) because it bought breakouts even in
 * choppy or falling markets. Adding a long-term trend filter should keep only
 * the trades that happen inside a confirmed uptrend)Skip the false breakouts.
 * When it buys and sells: buy with full cash only when the daily close breaks
 * above the 55-day high AND price is above the 200-day simple average (uptrend);
 * sell everything when the close breaks below the 30-day low.
 * When it does NOT work: the 200-day filter means it stays flat during long
 * bear markets and misses the first leg of a new bull run until the 200-day
 * average turns up. It still holds through pullbacks in a real trend, so
 * drawdown is not zero.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;

  const entryHigh = ctx.high(55, 1);
  if (entryHigh == null) return null;
  const exitLow = ctx.low(30, 1);
  if (exitLow == null) return null;
  // trend filter: only long when price holds above the long-term average
  const trend = ctx.sma(200, 1);
  if (trend == null) return null;

  if (pos <= 0) {
    // require confirmed uptrend to avoid buying in a downtrend (cuts MDD)
    if (price > entryHigh && price > trend) {
      return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
    }
    return null;
  } else {
    if (price < exitLow) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
