/*
 * @coinsori-strategy v1
 * name: SOL Trend-Pullback Mean Reversion 1D
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: In a confirmed uptrend (price above the 200-day average), normal
 * pullbacks to the 20-day average are buying opportunities — the trend resumes more often
 * than it breaks. This is the shallow-dip version of the RSI2 panic-dip champion: it buys
 * the common mild pullback instead of waiting for a deep capitulation, so it participates
 * in bull markets more often. Same proven risk structure (short hold, hard stop, cooldown)
 * keeps drawdowns small.
 * When it buys and sells: Buys when the daily close is above the 200-day average, has pulled
 * back below the 20-day average, and RSI(14) is below 40 (a real dip, not a breakdown).
 * Sells after 8 days, when RSI(14) turns overbought above 65, or on an 8% stop. Then waits
 * 5 days before buying again.
 * When it does NOT work: In a choppy sideways market price keeps touching the 20-day line
 * and every touch is a small loss. In a fast crash the 8% stop is not tight enough. No data
 * before Aug 2020.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;
  const st = ctx.state;
  const pos = ctx.position;

  const rsi = ctx.rsi(14, 1);
  const ema20 = ctx.ema(20, 1);
  const sma200 = ctx.sma(200, 1);
  const lastClose = ctx.closes.at(-2);
  if (rsi == null || ema20 == null || sma200 == null || lastClose == null) return null;

  if (pos > 0) {
    const entry = st.entryPx || price;
    const held = ctx.i - (st.entryBar || ctx.i);
    const rsiNow = ctx.rsi(14, 0);
    const stop = entry * 0.92;
    ctx.watch([{ side: 'sell', price: stop, trigger: 'below', note: '8% stop' }]);
    // Exit on stop, overbought, or time limit — mean reversion decays fast, so don't hold.
    if (price <= stop || rsiNow > 65 || held >= 8) {
      st.cooldownUntil = ctx.i + 5;   // 5-day pause avoids re-buying the same dip repeatedly
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (st.cooldownUntil != null && ctx.i < st.cooldownUntil) return null;
  // Buy only in a confirmed uptrend (above 200-day), after a pullback to/below the 20-day
  // average, and only when RSI(14) < 40 (a genuine dip, not a breakdown).
  if (lastClose > sma200 && lastClose < ema20 && rsi < 40) {
    st.entryPx = price;
    st.entryBar = ctx.i;
    ctx.watch([{ side: 'sell', price: price * 0.92, trigger: 'below', note: '8% stop' }]);
    return { side: 'buy', qty: ctx.cash / price * 0.9 };
  }
  return null;
}
