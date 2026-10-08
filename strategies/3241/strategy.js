/*
 * @coinsori-strategy v1
 * name: BTC 4H Volume-Confirmed Donchian Breakout
 * ex: binance
 * syms: BTC
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy:
 * On BTC, a 20-bar high breakout that is accompanied by above-average volume is a
 * real trend ignition, not a fakeout — volume is the participation filter.
 * When it buys and sells:
 * Buys when price closes above the highest high of the last 20 closed bars AND volume
 * is above its 20-bar average. Sells when price closes below its 50-bar SMA (trend
 * broken) or a 15% hard stop is hit.
 * When it does NOT work:
 * In a tight sideways range, repeated fake breakouts above the 20-bar high trigger
 * whipsaw entries and fees bleed the account.
 */
function onUpdate(ctx) {
  const hh = ctx.high(20, 1);        // highest high of 20 closed bars (Donchian upper)
  const sma50 = ctx.sma(50, 1);
  const avgVol = ctx.avgVol(20);
  const vol = ctx.vol;
  const price = ctx.price;

  if (hh == null || sma50 == null || avgVol == null) return null;

  const inPos = ctx.position > 0;
  const entry = ctx.entryPx || 0;

  // EXIT: trend broken (below SMA50) or 15% hard stop
  if (inPos) {
    if (price < sma50 || (entry > 0 && price <= entry * 0.85)) {
      return { side: 'sell', qty: ctx.position };
    }
    return null;
  }

  // ENTRY: 20-bar high breakout + volume above average
  if (price > hh && vol > avgVol * 1.2) {
    const qty = ctx.cash / price * 0.99;
    return { side: 'buy', qty };
  }
  return null;
}
