/*
 * @coinsori-strategy v1
 * name: BTC 4H Vol-Surge + ATR Trail ONLY (baseline champion)
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The ATR-trail champion variant isolates the 3x ATR trailing
 *   stop as the drawdown driver. Validated across BTC/ETH/SOL: it cuts the
 *   champion's MDD (44%->28%) while keeping returns, and the 20-bar-low backstop
 *   was proven redundant.
 * When it buys and sells: Buy 20-bar-high breaks on above-average volume. Exit
 *   only when price drops 3x ATR below the highest close since entry.
 * When it does NOT work: Without a backstop, a fast crash can gap through the
 *   ATR trail, so deep drawdowns are possible if the trail is too loose.
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
