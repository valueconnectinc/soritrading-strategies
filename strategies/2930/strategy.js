/*
 * @coinsori-strategy v1
 * name: ETH 4H Bollinger MR Uptrend6+RisingSMA
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: ETH overshoots down on fear and snaps back, but buying dips
 * near the 200-bar trend line catches falling knives when a bull phase ends.
 * This version combines two strong trend filters: price must be at least 6%
 * above the 200-bar average AND the 200-bar average itself must be rising. Both
 * together mean the longer-term trend is unambiguously up, so a dip is a real
 * pullback rather than the start of a bear move.
 * When it buys and sells: it buys when price closes below the 20-bar lower
 * Bollinger band with RSI below 35, price at least 6% above the 200-bar average,
 * AND the 200-bar average is rising. It sells when price returns to the middle
 * band or RSI climbs above 60. Size is ATR-scaled (risk 2% on a 2-ATR stop).
 * When it does NOT work: it misses dips that start near the trend line in early
 * bull phases. In a strong melt-up it sits in cash and lags buy-and-hold. The
 * double filter can starve it of trades in choppy markets.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200old = ctx.sma(200, 61);
  const atr = ctx.atr(14, 1);
  const px = ctx.closes[ctx.closes.length - 2];
  if (bb == null || bb.lower == null || rsi == null || sma200 == null || sma200old == null || atr == null || px == null) return null;

  if (ctx.position > 0) {
    if (px >= bb.mid || rsi > 60) return { side: 'sell', qty: ctx.position };
    return null;
  }

  // Double trend gate: 6% above the 200-SMA AND the 200-SMA rising.
  if (px <= bb.lower && rsi < 35 && px > sma200 * 1.06 && sma200 > sma200old) {
    const equity = ctx.cash + ctx.position * ctx.price;
    const stopDist = 2 * atr;
    const qty = Math.max(0, Math.min((equity * 0.02) / stopDist, (ctx.cash / ctx.price) * 0.95));
    if (qty > 0) return { side: 'buy', qty: qty };
  }
  return null;
}
