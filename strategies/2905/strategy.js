/*
 * @coinsori-strategy v1
 * name: Deep-Pullback Buy-the-Dip BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: A long-horizon contrarian idea, different from the daily
 * Keltner band-touch mean reversion. In a confirmed long uptrend (price above the
 * 200-day average), sharp pullbacks of 25%+ from the recent 200-day high are often
 * panic overreactions that mean-revert. This buys the deep dip and sells on recovery
 * toward the prior high, capturing the snap-back without trying to time the exact bottom.
 * When it buys and sells: buys when price pulls back >=25% from its 200-day high while
 * staying above the 200-day average; sells when price recovers to within 10% of the
 * 200-day high, or after a max 120-day hold, or if price breaks below the 200-day average.
 * When it does NOT work: in a persistent bear market below the 200-day average it stays
 * idle; in a slow grind-down where pullbacks keep making lower lows it buys falling
 * knives; it misses fast melt-ups because it waits for a deep pullback.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;

  const st = ctx.state;

  // Track the 200-day high using the closes array (200-day window).
  const closes = ctx.closes;
  if (!closes || closes.length < 200) return null;
  let high200 = -Infinity;
  for (let k = closes.length - 200; k < closes.length; k++) {
    if (Number.isFinite(closes[k]) && closes[k] > high200) high200 = closes[k];
  }
  if (!Number.isFinite(high200) || high200 <= 0) return null;

  const pullback = (high200 - price) / high200; // 0.25 = 25% below the 200-day high

  if (pos > 0) {
    // Exit on recovery toward the high, max hold, or trend break.
    const recovered = price >= high200 * 0.90; // within 10% of the 200-day high
    const heldTooLong = st.entryBar != null && (ctx.i - st.entryBar) >= 120;
    const trendBreak = price < sma200;
    if (recovered || heldTooLong || trendBreak) {
      st.entryBar = null;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Buy a deep pullback in an uptrend.
  // 25% pullback threshold: deep enough to be a real panic, shallow enough to occur
  // several times per bull run. Above the 200-day average = still in the long uptrend.
  if (price > sma200 && pullback >= 0.25) {
    st.entryBar = ctx.i;
    return { side: 'buy', qty: ctx.cash / price * 0.9 };
  }
  return null;
}
