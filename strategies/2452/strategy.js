/*
 * @coinsori-strategy v1
 * name: BTC 4H Vol-Surge + ATR Trail + Trend Gate
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The champion (volume-surge breakout + 3x ATR trail) has a
 *   robust exit but its entry takes every 20-bar-high breakout, including many
 *   that fail in downtrends. This adds an uptrend filter so breakouts are only
 *   bought when price already sits above the long EMA — betting breakouts
 *   continue more reliably in an established uptrend and cutting whipsaw MDD.
 * When it buys and sells: Buy when price breaks the 20-bar high on >1.5x
 *   average volume AND price is above the 200-bar EMA. Exit when price drops
 *   3x ATR below the highest close since entry (trailing).
 * When it does NOT work: In a strong bear the EMA gate keeps it flat (good),
 *   but it also misses early-reversal breakouts that start below the EMA. It
 *   may also sit out of a V-shaped melt-up that begins below the long EMA.
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
  const ema200 = ctx.ema(200, 1);
  if (vol == null || avgVol == null || ema200 == null) return null;

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
  // trend gate: only take breakouts above the long EMA
  if (price > hh && vol > avgVol * 1.5 && price > ema200) {
    ctx.state.highest = price;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
