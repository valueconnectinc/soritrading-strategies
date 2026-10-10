/*
 * @coinsori-strategy v1
 * name: SOL RSI2 Panic Dip Cooldown 1D
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Same validated rule as the BTC RSI2 Panic Dip applied to SOL — a higher-beta asset with bigger panic dips and bigger bounces. In an uptrend, extreme oversold (2-period RSI) marks a panic that is usually bought back.
 * When it buys and sells: Buys when the 2-period RSI drops below 10 while price is above the 200-day average; sells after 5 days, when RSI turns overbought, or on an 8% stop. After a stop-out it waits 10 days before buying again.
 * When it does NOT work: In a real bear market price keeps falling after the panic dip; repeated stop-outs are the main loss source, so the cooldown skips re-entry into a still-falling market. No data before Aug 2020.
 */

function onUpdate(ctx) {
  const rsi = ctx.rsi(2, 1);       // closed bar RSI(2)
  const trend = ctx.sma(200, 1);   // closed 200-day average
  const price = ctx.price;
  if (rsi == null || trend == null || price == null) return null;

  const st = ctx.state;

  if (ctx.position <= 0) {
    // After a stop-out, wait out a cooldown: the panic thesis failed, so re-entering
    // the next dip into a still-falling market just bleeds another 8% stop-out.
    if (st.cooldownUntil != null && ctx.i < st.cooldownUntil) return null;
    // Buy extreme panic only inside an uptrend (price above the 200-day average)
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
  // Exit on stop, overbought, or a 5-day time limit (mean reversion decays fast)
  if (stopped || rsiNow > 70 || barsHeld >= 5) {
    if (stopped) st.cooldownUntil = ctx.i + 10;  // ~2 weeks before risking capital again
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
