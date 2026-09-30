/*
 * @coinsori-strategy v1
 * name: BTC 1D Fear-Greed Sentiment Contrarian
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: A genuinely different family from the price-based mean-reversion
 * champion. Crypto sentiment (the Fear & Greed index) is mean-reverting and
 * contrarian: extreme fear marks panic capitulation (good buying), extreme greed
 * marks euphoria (good selling). This bets on sentiment extremes, not on price
 * bands, so it decorrelates from the OBV/Keltner champion.
 * When it buys and sells: It buys when the Fear & Greed index is at extreme fear
 * (<=25, panic) and sells when it reaches extreme greed (>=75, euphoria). If the
 * Fear & Greed dataset is unavailable (null) it falls back to price-based RSI
 * extremes so the strategy still trades on the same contrarian logic.
 * When it does NOT work: In a persistent bear it buys panics that keep falling
 * (the index can stay at extreme fear for weeks) and in a relentless melt-up it
 * sells too early and misses the top. It needs sentiment to actually swing.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const st = ctx.state;

  // Read the Fear & Greed index (0-100) from the external dataset if connected.
  let fg = null;
  try {
    const v = ctx.data('fear_greed');
    if (v != null && Number.isFinite(v)) fg = v;
  } catch (e) { fg = null; }

  // Fallback sentiment: derive a 0-100 proxy from RSI when the dataset is null.
  const rsi = ctx.rsi(14, 1);
  if (fg == null && rsi != null) {
    fg = Math.max(0, Math.min(100, rsi));   // RSI is already 0-100, same scale
  }
  if (fg == null) return null;

  if (pos > 0) {
    // Exit into euphoria (greed) — take profit when sentiment peaks.
    if (fg >= 75) {
      st.cd = ctx.i + 5;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Cooldown after a trade to avoid whipsawing on sentiment noise.
  if (st.cd != null && ctx.i < st.cd) return null;

  // Buy at extreme fear (panic) — contrarian long.
  if (fg <= 25) {
    st.cd = null;
    return { side: 'buy', qty: (ctx.cash / price) * 0.9 };
  }
  return null;
}
