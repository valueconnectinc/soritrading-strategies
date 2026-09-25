/*
 * @coinsori-strategy v1
 * name: BTC 4H Vol-Surge + ATR Trail + Vol-Scaled Size
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The champion (volume-surge + 3x ATR trail) is proven but
 *   carries 27-32% MDD. High-volatility regimes (ATR far above its own average)
 *   are where drawdowns concentrate, so scaling position down there should cut
 *   MDD without hard on/off gates that killed bull-run returns.
 * When it buys and sells: Buy 20-bar-high breaks on above-average volume.
 *   Position size shrinks as ATR rises relative to its 50-bar average. Exit when
 *   price drops 3x ATR below the highest close since entry.
 * When it does NOT work: A smooth size lever can still be caught in a fast crash
 *   before it de-risks, and in a sustained calm melt-up it underweights the trend.
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
    // Volatility-scaled sizing: full size when ATR is calm, shrink as ATR rises.
    // ATR/avgATR > 1.5 -> half size; > 2 -> quarter size. Smooth, no hard gate.
    const atr = ctx.atr(14, 1);
    let size = 0.98;
    if (atr != null) {
      let atrSum = 0, atrN = 0;
      for (let i = 1; i <= 50; i++) {
        const a = ctx.atr(14, i);
        if (a == null) break;
        atrSum += a; atrN++;
      }
      if (atrN >= 20) {
        const avgAtr = atrSum / atrN;
        const ratio = atr / avgAtr;
        if (ratio > 2) size = 0.24;
        else if (ratio > 1.5) size = 0.49;
      }
    }
    ctx.state.highest = price;
    return { side: 'buy', qty: ctx.cash / ctx.price * size };
  }
  return null;
}
