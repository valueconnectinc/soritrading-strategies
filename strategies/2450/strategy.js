/*
 * @coinsori-strategy v1
 * name: BTC 4H Vol-Surge + ATR Trail 2.5x
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Same as the ATR-trail champion variant but with a tighter
 *   2.5x ATR trailing stop — sensitivity test to see how the exit multiplier
 *   affects the drawdown/return tradeoff on BTC 4H.
 * When it buys and sells: Buy 20-bar-high breaks on above-average volume. Exit
 *   when price drops 2.5x ATR below the highest close since entry, or below the
 *   20-bar low as backstop.
 * When it does NOT work: Tighter trail exits more winners on normal pullbacks.
 */
function onUpdate(ctx) {
  let hh = -Infinity, ll = Infinity;
  for (let i = 1; i <= 20; i++) {
    const h = ctx.high(20, i);
    const l = ctx.low(20, i);
    if (h == null || l == null) return null;
    if (h > hh) hh = h;
    if (l < ll) ll = l;
  }
  const price = ctx.price;
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(50);
  if (vol == null || avgVol == null) return null;

  const pos = ctx.position;
  if (pos > 0) {
    const atr = ctx.atr(14, 1);
    if (atr == null) return null;
    const s = ctx.state;
    if (s.highest == null || price > s.highest) s.highest = price;
    const stop = s.highest - 2.5 * atr;
    if (price < stop || price < ll) return { side: 'sell', qty: pos };
    return null;
  }
  if (price > hh && vol > avgVol * 1.5) {
    ctx.state.highest = price;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
