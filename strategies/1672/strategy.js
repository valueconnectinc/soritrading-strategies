/*
 * @coinsori-strategy v1
 * name: BB ATR Mean Reversion NEARUSDT 4H
 * ex: binance
 * syms: NEARUSDT
 * interval: 4h
 * cash: 1000
 *
 * BB+ATR mean reversion with volume confirmation filter.
 * In bull windows, mid-band is a natural resistance where price reverts.
 * Volume filter avoids false signals in low-liquidity periods.
 * When it buys and sells: buy on lower-band touch in calm market with
 * above-average volume; sell on mid-band touch, ATR spike, or stop-loss.
 * When it does NOT work: strong trending markets where mean reversion fails;
 * high-ATR events break the calm-regime filter; low-liquidity coins.
 */
function onUpdate(ctx) {
  const s = ctx.state;

  if (!s.atrHist) { s.atrHist = []; s.lastBarI = -1; }

  if (ctx.i !== s.lastBarI) {
    s.lastBarI = ctx.i;
    const curAtr = ctx.atr(14);
    if (curAtr != null) {
      s.atrHist.push(curAtr);
      if (s.atrHist.length > 25) s.atrHist.shift();
    }
  }

  const bb   = ctx.bb(20, 2);
  const atr  = ctx.atr(14);
  if (bb == null || atr == null) return null;

  let atrSma = null;
  if (s.atrHist.length >= 20) {
    let sum = 0;
    for (let i = 0; i < 20; i++) sum += s.atrHist[s.atrHist.length - 20 + i];
    atrSma = sum / 20;
  }
  if (atrSma == null) return null;

  const inCalm = atr < atrSma;
  const price  = ctx.price;
  const lower  = bb.lower;
  const upper  = bb.upper;
  const mid    = (bb.upper + bb.lower) / 2;

  // Volume filter: require above-average volume to confirm the signal
  // Low volume on lower-band touch often means a weak bounce, not a real reversal
  const avgVol = ctx.avgVol(20);
  const curVol = ctx.vol;
  const volConfirm = avgVol != null && curVol != null && curVol > avgVol * 1.2;

  // === ENTRY ===
  if (ctx.position === 0) {
    if (price <= lower && inCalm && volConfirm) {
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  // === EXIT ===
  if (ctx.position > 0) {
    // ATR regime shift: exit when volatility spikes
    if (atr > atrSma * 1.5) return { side: 'sell', qty: ctx.position };

    // Mid-band exit: sell when price reverts to the middle band
    if (price >= mid) return { side: 'sell', qty: ctx.position };

    // Stop-loss: 3× ATR below entry
    const entryPx = ctx.entryPx;
    if (entryPx != null && price <= entryPx * (1 - 3 * atr / entryPx)) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
