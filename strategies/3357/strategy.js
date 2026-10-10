/*
 * @coinsori-strategy v1
 * name: SOL Fear-Greed Contrarian 1D
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The Crypto Fear & Greed Index is a crowd-sentiment gauge (0=extreme
 * fear, 100=extreme greed). Crypto has historically rewarded buying panic and trimming
 * euphoria. This uses the sentiment index as the signal — a different data source than the
 * price-only RSI2 champion — and only buys inside an uptrend so we do not catch falling knives
 * in a bear market.
 * When it buys and sells: Buys when the Fear & Greed Index is at or below 20 (extreme fear)
 * while price is above the 200-day average. Sells when the index reaches 80 (extreme greed),
 * price falls 12% below entry, or after 60 days. Waits 10 days after any exit before buying again.
 * When it does NOT work: Sentiment can stay fearful for months in a grinding bear even above a
 * trend line — the trend gate limits entries but not a slow bleed. The index is BTC-driven, so
 * SOL-specific rallies can exit early on greed readings. No SOL data before Aug 2020.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const fg = ctx.data('fear_greed');
  const sma200 = ctx.sma(200, 1);
  if (!Number.isFinite(price) || price <= 0) return null;
  if (fg == null || sma200 == null) return null;   // data gap or warm-up: do nothing

  const st = ctx.state;
  const pos = ctx.position;

  if (pos <= 0) {
    if (st.cooldownUntil != null && ctx.i < st.cooldownUntil) return null;
    // Extreme fear + uptrend: buy panic, but only when the long-term trend is still up
    // (keeps us out of 2022-style bear markets where fear persists for months).
    if (fg <= 20 && price > sma200) {
      st.entryBar = ctx.i;
      st.entryPx = price;
      ctx.watch([{ side: 'sell', price: price * 0.88, trigger: 'below', note: '12% stop' }]);
      return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
    }
    return null;
  }

  const entry = st.entryPx || price;
  const barsHeld = ctx.i - (st.entryBar || ctx.i);
  const stopped = price <= entry * 0.88;
  ctx.watch([{ side: 'sell', price: entry * 0.88, trigger: 'below', note: '12% stop' }]);
  // Exit on extreme greed (contrarian take-profit), the 12% stop, or a 60-day time limit.
  if (fg >= 80 || stopped || barsHeld >= 60) {
    st.cooldownUntil = ctx.i + 10;
    return { side: 'sell', qty: pos };
  }
  return null;
}
