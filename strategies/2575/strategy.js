/*
 * @coinsori-strategy v1
 * name: Donchian Bull-WideStop BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated defensive Donchian (55d-high entry, 30d-low
 * exit, 3x-ATR disaster stop) protects in bear/transition regimes but exits too
 * early in strong sustained bulls (W3 2022-26 only +67% vs hold +262%). This
 * widens the exit stop to a 55-day low ONLY when price is in a confirmed bull
 * (above a 200-day EMA), so it rides strong trends longer without giving up the
 * defensive protection in bears. Pure price-based regime signal (no external
 * data), fully backtestable and robust.
 * When it buys and sells: buys a 55d-high breakout unless in a steep downtrend;
 * exits on a 30d-low in bear/neutral regimes, or a 55d-low when price is above
 * the 200d EMA (confirmed bull), plus a 3x-ATR disaster stop.
 * When it does NOT work: deep bear-market crashes where even the wide stop is too
 * late; choppy sideways markets that whipsaw the breakout entry.
 */
function onUpdate(ctx) {
  const hh55 = ctx.high(55, 1);
  const ll30 = ctx.low(30, 1);
  const ll55 = ctx.low(55, 1);
  const atr = ctx.atr(14, 1);
  const ema50 = ctx.ema(50, 1);
  const ema200 = ctx.ema(200, 1);
  if (hh55 == null || ll30 == null || ll55 == null || atr == null || ema50 == null || ema200 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
    // In a confirmed bull (price above 200d EMA), hold through normal pullbacks
    // by using the wider 55d-low stop instead of the tight 30d-low.
    const exitStop = price > ema200 ? ll55 : ll30;
    if (price < exitStop) return { side: 'sell', qty: pos };
    return null;
  }

  const inSteepDowntrend = price < ema50 - atr * 3;
  if (inSteepDowntrend) return null;

  if (price > hh55) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
