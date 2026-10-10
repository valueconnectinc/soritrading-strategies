/*
 * @coinsori-strategy v1
 * name: SOL RSI2 Panic Dip Capitulation 1D
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Same validated RSI2 panic-dip rule as 3348, plus a capitulation-depth requirement. An extreme oversold reading only counts when price has actually fallen hard from its recent high, so we buy genuine panics instead of shallow dips in a weak market.
 * When it buys and sells: Buys when the 2-period RSI drops below 10, price is above the 200-day average, AND price is at least 10% below its 50-day high. Sells after 5 days, when RSI turns overbought, or on an 8% stop. After ANY exit it waits 10 days before buying again.
 * When it does NOT work: In a grinding bear market price can keep falling after a capitulation; in a fast V-recovery it may enter one bar late. No data before Aug 2020.
 */

function onUpdate(ctx) {
  const rsi = ctx.rsi(2, 1);       // closed bar RSI(2)
  const trend = ctx.sma(200, 1);   // closed 200-day average
  const price = ctx.price;
  if (rsi == null || trend == null || price == null) return null;

  const st = ctx.state;

  if (ctx.position <= 0) {
    // Panic dips come in clusters; re-entering every dip in a row is overtrading and
    // bleeds fees. Take only the first dip after a 10-day cooldown from any exit.
    if (st.cooldownUntil != null && ctx.i < st.cooldownUntil) return null;
    // Capitulation depth: RSI2<10 alone fires on shallow dips in weak markets.
    // Requiring price >=10% below the 50-day high ensures we only buy genuine panics.
    const high50 = ctx.high(50, 1);
    if (high50 == null) return null;
    if (rsi < 10 && price > trend && price <= high50 * 0.90) {
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
    st.cooldownUntil = ctx.i + 10;  // ~2 weeks before risking capital again
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
