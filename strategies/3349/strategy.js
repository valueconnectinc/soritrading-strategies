/*
 * @coinsori-strategy v1
 * name: SOL RSI2 Panic Dip Cooldown baseline 1D
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Baseline comparison copy of strategy 3348 BEFORE the capitulation-depth filter was added. Kept only to measure the filter's effect on identical windows; not for live use.
 * When it buys and sells: Buys when the 2-period RSI drops below 10 while price is above the 200-day average; sells after 5 days, when RSI turns overbought, or on an 8% stop. After ANY exit it waits 10 days before buying again.
 * When it does NOT work: In a real bear market price keeps falling after the panic dip; the cooldown skips re-entry into a still-falling market but also misses the first sharp bounce of a V-recovery.
 */

function onUpdate(ctx) {
  const rsi = ctx.rsi(2, 1);       // closed bar RSI(2)
  const trend = ctx.sma(200, 1);   // closed 200-day average
  const price = ctx.price;
  if (rsi == null || trend == null || price == null) return null;

  const st = ctx.state;

  if (ctx.position <= 0) {
    if (st.cooldownUntil != null && ctx.i < st.cooldownUntil) return null;
    if (rsi < 10 && price > trend) {
      st.entryBar = ctx.i;
      ctx.watch([{ side: 'sell', price: price * 0.92, trigger: 'below', note: '8% stop' }]);
      return { side: 'buy', qty: ctx.cash / price * 0.9 };
    }
    return null;
  }

  const entry = ctx.entryPx || price;
  const barsHeld = ctx.i - (st.entryBar || ctx.i);
  const rsiNow = ctx.rsi(2, 0);
  const stopped = price <= entry * 0.92;
  ctx.watch([{ side: 'sell', price: entry * 0.92, trigger: 'below', note: '8% stop' }]);
  if (stopped || rsiNow > 70 || barsHeld >= 5) {
    st.cooldownUntil = ctx.i + 10;
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
