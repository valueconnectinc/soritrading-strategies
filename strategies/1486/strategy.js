/*
 * @coinsori-strategy v1
 * name: RSI BB Mean Reversion v3 (Trailing ATR Exit)
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Refined mean reversion: looser exit to let winners run.
 * Entry: RSI < 35 + price at lower BB + volume > avg.
 * Exit: RSI > 70 OR price at upper BB (removed the rsi>50 early exit).
 * Also adds a trailing ATR stop (2.5× ATR from peak) to lock in profits.
 * When it fails: Same as v1 — strong downtrends where oversold keeps worsening.
 */
function onUpdate(ctx) {
  const state = ctx.state;
  const rsi  = ctx.rsi(14);
  const bb   = ctx.bb(20, 2);
  const atr  = ctx.atr(14);
  if (rsi == null || bb == null || atr == null) return null;

  const price  = ctx.price;
  const lower  = bb.lower;
  const upper  = bb.upper;
  const vol    = ctx.vol;
  const avgVol = ctx.avgVol(20);
  const volOk  = avgVol != null && vol != null && vol > avgVol * 0.8;

  // ── Entry ──
  if (ctx.position === 0) {
    if (rsi < 35 && price <= lower && volOk) {
      state.entryPx = price;
      state.peakPx  = price;
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  // ── Trailing ATR stop + exit ──
  if (ctx.position > 0) {
    if (price > state.peakPx) state.peakPx = price;
    const trailStop = state.peakPx - 2.5 * atr;
    if (price <= trailStop) {
      return { side: 'sell', qty: ctx.position };
    }
    if (rsi > 70 || price >= upper) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
