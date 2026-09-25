/*
 * @coinsori-strategy v1
 * name: BTC 1D Vol-Surge + ATR Trail (champion transfer)
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The proven 4H champion recipe (20-bar high break + volume
 *   surge + 3x ATR trail) transferred to daily bars — fewer trades (lower fees)
 *   and captures longer trends. Clean transfer test of the 4H edge on 1D.
 * When it buys and sells: Buy 20-day-high breaks on above-average volume. Exit
 *   only when price drops 3x ATR below the highest close since entry.
 * When it does NOT work: 20-day lookback reacts more slowly than 4H, so entries
 *   lag; in choppy multi-week ranges it can whipsaw. Fast crashes can gap through
 *   the ATR trail before it triggers.
 */
function onUpdate(ctx) {
  let hh = -Infinity;
  for (let i = 1; i <= 20; i++) {
    const h = ctx.high(20, i);
    if (h == null) return null;
    if (h > hh) hh = h;
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
    const stop = s.highest - 3 * atr;
    if (price < stop) return { side: 'sell', qty: pos };
    return null;
  }
  if (price > hh && vol > avgVol * 1.5) {
    ctx.state.highest = price;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
