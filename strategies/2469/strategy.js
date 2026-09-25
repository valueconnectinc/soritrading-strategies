/*
 * @coinsori-strategy v1
 * name: BTC 4H Vol-Surge + ATR Trail + Trend-Gated Size
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The champion's weak window is the bear (W3, +35% vs
 *   +241% in the bull). Instead of filtering entries (which hurt W3), this
 *   scales POSITION SIZE by trend: full size when price is above the 4h
 *   EMA100 (uptrend), half size when below (downtrend). Preserves the bear
 *   trades but with less exposure, targeting a lower drawdown.
 * When it buys and sells: Buy a 20-bar-high break on >1.5x volume. Size is
 *   full when price > EMA100, half when below. Exit when price drops 3x ATR
 *   below the highest close since entry.
 * When it does NOT work: In a choppy sideways market the EMA100 flip-flops
 *   and sizing whipsaws. Half-sizing in the bear also means it participates
 *   less in any sharp bear-rally (dead-cat bounce) breakouts.
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
  const ema100 = ctx.ema(100, 1);
  if (ema100 == null) return null;

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
    // half size in a downtrend, full size in an uptrend (cut bear exposure)
    const sizeMult = price > ema100 ? 0.98 : 0.49;
    return { side: 'buy', qty: ctx.cash / ctx.price * sizeMult };
  }
  return null;
}
