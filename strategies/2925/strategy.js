/*
 * @coinsori-strategy v1
 * name: ETH 4H Bollinger MR Strong-Uptrend-Only
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: ETH overshoots down on fear and snaps back, but buying dips
 * near the 200-bar trend line in early 2022 caught a falling knife as the bear
 * took hold. This version only buys dips while price is comfortably ABOVE the
 * 200-bar average (at least 5% above), meaning the longer-term trend is clearly
 * up and a dip is a real pullback, not the start of a reversal.
 * When it buys and sells: it buys when price closes below the 20-bar lower
 * Bollinger band with RSI below 35 AND price is at least 5% above the 200-bar
 * average. It sells when price returns to the middle band or RSI climbs above 60.
 * Size is ATR-scaled (risk 2% on a 2-ATR stop).
 * When it does NOT work: it misses dips that start from near the trend line in
 * early bull phases. In a strong melt-up it sits in cash and lags buy-and-hold.
 * In a choppy market few entries qualify, so it may take very few trades.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const atr = ctx.atr(14, 1);
  const px = ctx.closes[ctx.closes.length - 2];
  if (bb == null || bb.lower == null || rsi == null || sma200 == null || atr == null || px == null) return null;

  if (ctx.position > 0) {
    if (px >= bb.mid || rsi > 60) return { side: 'sell', qty: ctx.position };
    return null;
  }

  // Strong-uptrend gate: price must be at least 5% above the 200-bar average so
  // we only buy dips in a clearly rising market, skipping near-trend-line reversals.
  if (px <= bb.lower && rsi < 35 && px > sma200 * 1.05) {
    const equity = ctx.cash + ctx.position * ctx.price;
    const stopDist = 2 * atr;
    const qty = Math.max(0, Math.min((equity * 0.02) / stopDist, (ctx.cash / ctx.price) * 0.95));
    if (qty > 0) return { side: 'buy', qty: qty };
  }
  return null;
}
