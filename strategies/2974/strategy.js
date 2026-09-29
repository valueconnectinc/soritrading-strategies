/*
 * @coinsori-strategy v1
 * name: BTC 1D Fear-Greed Contrarian v2
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The crypto Fear & Greed Index is a crowd-sentiment gauge.
 * Extreme fear marks capitulation (good time to buy), extreme greed marks
 * euphoria (good time to trim). This is a sentiment family — completely
 * different from price-only mean reversion or momentum — and it uses the
 * user's own fear_greed dataset, which is verified available.
 * When it buys and sells: Buys when the index is deeply fearful (below 25)
 * while price is above a rising 200-day average (only buy fear inside an
 * uptrend). Sells when the index turns greedy (above 65) or when the 20-day
 * average breaks down. Otherwise holds.
 * When it does NOT work: In a long bear market fear can stay extreme for months
 * while price keeps falling — the 200-day uptrend gate keeps us out but means
 * we capture little. Rare extreme-fear prints mean few trades; the edge depends
 * on those few capitulation events actually marking a bottom.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  // Sentiment from the user's own dataset (verified available).
  const fg = ctx.data('fear_greed');
  const ema20 = ctx.ema(20, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  if (fg == null || ema20 == null || sma200 == null) return null;

  const uptrend = sma200prev != null && sma200 > sma200prev;

  if (pos > 0) {
    // Exit when sentiment turns greedy (euphoria) or the short trend breaks.
    if (fg > 65) {
      return { side: 'sell', qty: pos };
    }
    if (price < ema20) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Extreme fear is the contrarian buy trigger. Threshold 25 = deep fear zone.
  if (uptrend && fg < 25) {
    return { side: 'buy', qty: (ctx.cash / price) * 0.9 };
  }
  return null;
}
