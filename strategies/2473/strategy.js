/*
 * @coinsori-strategy v1
 * name: Cross-Asset Vol-Surge + ATR Trail (ETH/SOL)
 * ex: binance
 * syms: ETHUSDT, SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The BTC 4H volume-surge + 3x ATR trailing stop champion
 *   beat buy-and-hold on ETH and SOL in the recent bear window. This validates
 *   whether the protective ATR-trail signature generalizes across assets.
 * When it buys and sells: Buy 20-bar-high breaks on above-average (1.5x) volume.
 *   Exit when price drops 3x ATR below the highest close since entry.
 * When it does NOT work: In a fast crash the 3x ATR trail can gap through, so
 *   deep drawdowns are possible when the trail is too loose for the asset.
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
