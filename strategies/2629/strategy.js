/*
 * @coinsori-strategy v1
 * name: Band-Bounce Mean Reversion DOT 4H (trend-filtered)
 * ex: binance
 * syms: DOTUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The mean-reversion band-bounce family protects in bears
 * but the unfiltered version lost money in DOT's persistent 2024-26 downtrend
 * (it kept buying falling knives). Adding a 200-bar average trend filter means
 * we only buy panic dips while the longer-term trend is still up, avoiding
 * the persistent-decline regime that sinks the family.
 * When it buys and sells: buys when price closes below the lower Bollinger
 * (20,2) band AND RSI(14) < 30 AND price is above the 200-bar average; sells
 * when price recovers to the 20-bar SMA or RSI rises above 50, or on an 8%
 * stop loss.
 * When it does NOT work: it misses the early bounce of a new bull run (price
 * is still below the 200-bar average), and it lags strong melt-up rallies.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma20 = ctx.sma(20, 1);
  const sma200 = ctx.sma(200, 1);
  if (bb == null || rsi == null || sma20 == null || sma200 == null) return null;
  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (price <= ctx.entryPx * 0.92) return { side: 'sell', qty: pos };
    if (price >= sma20 || rsi > 50) return { side: 'sell', qty: pos };
    return null;
  }

  // only buy dips while the longer-term trend is still up (avoid falling knives)
  if (price > sma200 && price < bb.lower && rsi < 30) {
    const qty = ctx.cash / price * 0.95;
    return { side: 'buy', qty: qty };
  }
  return null;
}
