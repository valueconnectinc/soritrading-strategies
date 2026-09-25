/*
 * @coinsori-strategy v1
 * name: BTC 4H Vol-Surge + ATR Trail + Vol-Scaled Size
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The champion (vol-surge breakout + 3x ATR trail) is solid
 *   but its drawdown (27-32%) comes mostly from entering at high-volatility
 *   moments where a sharp adverse move hurts more. This scales position size
 *   DOWN when ATR is high (volatile/risky regime) and keeps full size when calm,
 *   targeting the drawdown without removing any entries.
 * When it buys and sells: Same entry as champion — buy 20-bar-high breaks on
 *   above-average volume. Position size is reduced when ATR(14) is above its
 *   own long average. Exit on the 3x ATR trailing stop.
 * When it does NOT work: Scaling down in volatile regimes also trims the size
 *   of the biggest trend winners (which often start in high volatility), so it
 *   can shave returns on melt-ups. Long-only, misses bear shorts.
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
    const atr = ctx.atr(14, 1);
    // compute ATR average over the last 50 closed bars
    let atrSum = 0, atrN = 0;
    for (let i = 1; i <= 50; i++) {
      const a = ctx.atr(14, i);
      if (a == null) break;
      atrSum += a; atrN++;
    }
    const atrMean = atrN > 0 ? atrSum / atrN : null;
    let size = ctx.cash / ctx.price * 0.98;
    // halve size when ATR is 20% above its average (volatile/risky regime)
    if (atr != null && atrMean != null && atr > atrMean * 1.2) {
      size *= 0.5;
    }
    return { side: 'buy', qty: size };
  }
  return null;
}
