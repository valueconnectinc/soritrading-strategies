/*
 * @coinsori-strategy v1
 * name: ADA Band-Bounce MR with ATR Stop 4H
 * ex: binance
 * syms: ADAUSDT
 * interval: 4h
 * cash: 1000
 *
 * Why this strategy: band-bounce mean reversion is the proven, repeatable edge
 * of this job (validated on LTC/XRP/DOT/ETC/LINK/ADA). Its documented weakness
 * is buying falling knives in strong downtrends — it holds until price returns
 * to mid-band, which can be a deep drawdown (ADA MDD up to 59%). A 3x ATR stop
 * had zero effect (exits fire before it triggers), so this tests a tighter 1.5x
 * ATR stop to see if it actually caps the drawdown.
 * When it buys and sells: buys when price closes at/below the lower Bollinger
 * band with RSI oversold; sells when price returns to the middle band, RSI turns
 * overbought, or the tighter ATR stop is hit.
 * When it does NOT work: in strong trending moves that hug the outer band for
 * long stretches (it keeps buying falling knives and now exits them early via
 * the stop, missing the eventual rebound).
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2);
  if (bb == null) return null;

  const rsi = ctx.rsi(14);
  const rsi_1 = ctx.rsi(14, 1);
  if (rsi == null || rsi_1 == null) return null;

  const atr = ctx.atr(14);
  if (atr == null) return null;

  const lower = bb.lower;
  const mid = bb.mid;

  // BUY: price at/below lower band AND RSI oversold
  const atLowerBand = ctx.price <= lower;
  const rsiOversold = rsi < 35;

  if (atLowerBand && rsiOversold && ctx.position === 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // SELL conditions once in a position
  if (ctx.position > 0) {
    // 1.5x ATR stop: tighter than the 3x that had no effect, so it actually
    // triggers and caps the falling-knife drawdown (no-stop MDD up to 59%).
    const stopPx = ctx.entryPx - 1.5 * atr;
    const stopHit = ctx.price <= stopPx;

    const atMidBand = ctx.price >= mid;
    const rsiOverbought = rsi > 65 && rsi_1 <= 65;

    if (stopHit || atMidBand || rsiOverbought) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
