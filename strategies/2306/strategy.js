/*
 * @coinsori-strategy v1
 * name: XRP Daily Donchian Trend
 * ex: binance
 * syms: XRPUSDT
 * interval: 1d
 * cash: 1000
 *
 * Trend-following breakout on daily bars. Bet: when price breaks out of a
 * multi-week range to a new high, strong momentum tends to persist in
 * crypto's long daily trendsched, so riding the move with a wide trailing
 * exit catches the big runs and sidesteps the deep drawdowns of holding.
 * When it buys: price closes above the highest high of the last 55 days.
 * When it sells: price closes below the lowest low of the last 30 days
 * (a wide exit that lets winners run and avoids choppy whipsaw).
 * When it does NOT work: flat, range-bound markets where breakouts are
 * false and price reverts — this bleeds on repeated fake breakouts. It also
 * lags the very start of strong bull runs because it waits for the breakout.
 */
function onUpdate(ctx) {
  // Donchian breakout needs a full window: 55-bar high and 30-bar low.
  const hi55 = ctx.high(55, 1);   // highest high, prev bars
  const lo30 = ctx.low(30, 1);    // lowest low, prev bars
  if (hi55 == null || lo30 == null) return null;
  const px = ctx.price;
  if (px == null) return null;

  const pos = ctx.position || 0;

  // ENTRY: new 55-day high on a closed bar -> go long with full capital.
  if (pos === 0) {
    if (px > hi55) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    return null;
  }

  // EXIT: close below the 30-day low -> trend broken, exit everything.
  if (px < lo30) {
    return { side: 'sell', qty: pos };
  }

  return null;
}
