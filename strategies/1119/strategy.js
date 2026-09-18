/*
 * @coinsori-strategy v1
 * name: Momentum Breakout Hold 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Buys when price breaks a tight consolidation (< 1.5% range) with volume surge
 * (1.5× avg). Holds for exactly 6 bars (24h) — no early exits, no stops.
 * The market often needs time to realize a breakout; exits too early kill winners.
 * When it sells: fixed 6-bar hold timer fires.
 * When it does NOT work: breakouts fail in choppy markets — false breakouts
 * get held for 24h, turning small drawdowns into real losses.
 */

// Closure variable persists across onUpdate calls (function object reused)
let _entryBar = null;

function onUpdate(ctx) {
  // ── Range width over last 20 bars ────────────────────────────
  const rangeH = ctx.high(20);
  const rangeL = ctx.low(20);
  if (rangeH == null || rangeL == null) return null;

  const rangePct = (rangeH - rangeL) / ctx.price;

  // ── Volume confirmation ───────────────────────────────────────
  const avgVol = ctx.avgVol(20);
  const volNow = ctx.vol;
  if (avgVol == null || volNow == null) return null;
  const volRatio = volNow / avgVol;

  // ── Entry: tight range + volume surge + price near 20-bar high ─
  const nearHigh = (ctx.price >= rangeH * 0.90);

  // ── Entry: record bar index on buy ────────────────────────────
  if (!ctx.position && rangePct < 0.015 && volRatio > 1.5 && nearHigh) {
    _entryBar = ctx.i;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // ── Exit: hold for exactly 6 bars, then sell at market ────────
  if (ctx.position > 0 && _entryBar !== null) {
    const barsHeld = ctx.i - _entryBar;
    if (barsHeld >= 6) {
      _entryBar = null;   // reset for next trade
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
