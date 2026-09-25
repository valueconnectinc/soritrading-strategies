/*
 * @coinsori-strategy v1
 * name: BTC 4H Vol-Surge + ATR Trail + EMA100 Gate
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The EMA200 gate on the champion helped the recent window
 *   (W3 MDD 31->22%) but hurt the middle window (W2 +70%->+47%). A looser
 *   EMA100 gate should filter fewer valid breakouts while still blocking the
 *   worst downtrend entries, hoping to keep the W3 gain without the W2 loss.
 * When it buys and sells: Buy when price breaks the 20-bar high on >1.5x
 *   average volume AND price is above the 100-bar EMA. Exit when price drops
 *   3x ATR below the highest close since entry (trailing).
 * When it does NOT work: The looser gate lets through more failing breakouts
 *   than EMA200 in deep bears, so MDD may not be as well controlled on W3.
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
  const ema100 = ctx.ema(100, 1);
  if (vol == null || avgVol == null || ema100 == null) return null;

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
  if (price > hh && vol > avgVol * 1.5 && price > ema100) {
    ctx.state.highest = price;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
