/*
 * @coinsori-strategy v1
 * name: BTC 1D Fear-Greed Sentiment Contrarian
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Crypto sentiment is a well-documented contrarian signal — markets
 * bottom in extreme fear and top in extreme greed. The Fear & Greed index (0-100) is a
 * sentiment gauge that historically marks good buying zones when it is deeply fearful.
 * This is a SENTIMENT family, completely different from price mean-reversion or trend.
 * When it buys and sells: Buys BTC when the Fear & Greed index is deeply fearful (below
 * 25) while price is above a rising 200-day average (so we only buy fear in an uptrend,
 * not a true bear). Sells when the index turns greedy (above 50) or price breaks the
 * 200-day average.
 * When it does NOT work: In a sustained bear market the index stays fearful for a long
 * time and each "fear" buy catches a falling knife — the 200-day gate limits but cannot
 * fully prevent this. It also sits in cash during steady bull grind (index stays in the
 * neutral-to-greedy zone) and lags buy-and-hold.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  // Sentiment gauge from the user's external DB (fear_greed dataset, 0-100).
  const fg = ctx.data('fear_greed');
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  if (fg == null || sma200 == null || sma200prev == null) return null;

  // Only take contrarian longs inside a healthy long-term uptrend.
  const uptrend = sma200 > sma200prev;

  if (pos > 0) {
    // Take profit once sentiment turns greedy (index > 50) or the trend breaks.
    if (fg > 50 || price < sma200) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Contrarian entry: buy deep fear (index < 25) only in an uptrend.
  if (uptrend && fg < 25) {
    return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
  }
  return null;
}
