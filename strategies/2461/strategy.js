/*
 * @coinsori-strategy v1
 * name: BTC 4H Vol-Surge + ATR Trail + FearGreed Gate 85
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The champion (vol-surge breakout + 3x ATR trail) is solid
 *   but buys breakouts at market tops. The F&G gate at 75 helped the recent
 *   windows but cut the 2019-22 melt-up badly (extreme greed persisted for weeks
 *   while price climbed). This loosens the gate to block ONLY the most extreme
 *   greed (F&G >= 85), hoping to keep the melt-up continuations while still
 *   avoiding the very worst exhaustion tops.
 * When it buys and sells: Buy 20-bar-high breaks on above-average volume ONLY
 *   when Fear & Greed is below 85. Exit on the 3x ATR trailing stop.
 * When it does NOT work: In a parabolic melt-up, F&G can sit above 85 for the
 *   entire run, so even this loose gate can miss the biggest trend. Depends on
 *   the Fear & Greed feed being available.
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

  const fg = ctx.data('fear_greed');
  if (fg == null) return null;
  if (price > hh && vol > avgVol * 1.5 && fg < 85) {
    ctx.state.highest = price;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
