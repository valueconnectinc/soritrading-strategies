/*
 * @coinsori-strategy v1
 * name: BB Squeeze Expansion 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Bollinger Band width (BBW) squeeze detection on 4H BTC. When BBW falls to its
 * lowest reading in 60 bars (~10 days), volatility is compressed — a breakout is
 * likely. Entry on the first candle that closes above the upper BB band after a squeeze.
 * Volume must confirm the breakout (above its 20-bar average).
 * Exits: 2.5×ATR profit target, or trailing stop at peak minus 2×ATR.
 * Loses in slow grinding trends where BBW never truly squeezes.
 */

function onUpdate(ctx) {
  const bb = ctx.bb(20, 2);
  if (bb == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const atr = ctx.atr(14);
  if (atr == null) return null;

  // BBW = (upper - lower) / middle * 100
  const bbw = (bb.upper - bb.lower) / bb.middle * 100;

  // Find 60-bar minimum BBW — squeeze threshold
  let minBbw = Infinity;
  for (let i = 0; i < 60; i++) {
    const b = ctx.bb(20, 2, i);
    if (b == null) break;
    const bw = (b.upper - b.lower) / b.middle * 100;
    if (bw < minBbw) minBbw = bw;
  }
  if (minBbw === Infinity) return null;

  const inSqueeze = bbw <= minBbw * 1.05; // within 5% of 60-bar low
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(20);
  const volConfirm = avgVol != null && vol != null && vol > avgVol;

  // === ENTRY: breakout above upper band after squeeze, volume confirms ===
  if (pos <= 0 && inSqueeze && price > bb.upper && volConfirm) {
    const riskAmt = ctx.cash * 0.015;
    const stopDist = atr * 2.0;
    const qty = riskAmt / stopDist;
    return { side: 'buy', qty: qty };
  }

  // === EXIT: manage open position ===
  if (pos > 0) {
    const entryPx = ctx.entryPx;
    if (entryPx == null) return null;

    const peak = ctx.state.peak || entryPx;
    if (price > peak) ctx.state.peak = price;
    const currPeak = ctx.state.peak || price;

    // Trailing stop: 2×ATR from peak
    if (price < currPeak - atr * 2) {
      return { side: 'sell', qty: pos };
    }

    // Profit target: 2.5×ATR from entry
    if (price >= entryPx + atr * 2.5) {
      return { side: 'sell', qty: pos };
    }
  }

  return null;
}
