/*
 * @coinsori-strategy v1
 * name: ETH 4H Bollinger MR Deep-Flush RSI30
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: ETH overshoots to the downside on fear and snaps back, but
 * only genuine capitulation flushes (very deep oversold) reward buying. Requiring
 * a deeper RSI<30 instead of RSI<35 filters out the shallow dips that keep
 * falling in a choppy bear, which is the regime (2022-24) where the shallower
 * version lost money.
 * When it buys and sells: it buys when price closes below the 20-bar lower
 * Bollinger band with RSI below 30 and price above the 200-bar average. It sells
 * when price returns to the middle band or RSI climbs above 60. Position size
 * scales with how far price fell below the band, so deeper dips get larger buys.
 * When it does NOT work: in a strong melt-up it sits in cash and lags buy-and-hold
 * (defensive by design). If ETH never reaches a deep RSI<30 flush it trades rarely
 * and returns little. In a violent crash below the 200-bar average it stays out
 * and misses any rebound.
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

  // Deeper oversold (RSI<30) to only buy true capitulation flushes, avoiding the
  // shallow dips that keep falling in the choppy 2022-24 bear.
  if (px <= bb.lower && rsi < 30 && px > sma200) {
    const equity = ctx.cash + ctx.position * ctx.price;
    const bandDist = Math.max(bb.mid - bb.lower, atr);
    const qty = Math.max(0, Math.min((equity * 0.04) / bandDist, (ctx.cash / ctx.price) * 0.95));
    if (qty > 0) return { side: 'buy', qty: qty };
  }
  return null;
}
