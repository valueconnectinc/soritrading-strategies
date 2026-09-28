/*
 * @coinsori-strategy v1
 * name: ETH 4H Bollinger Mean-Reversion ATR-Sized + Trailing
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: ETH overshoots to the downside on fear and snaps back.
 * Buying a deep dip to the lower Bollinger band when oversold (low RSI), and
 * only while price is above its 200-bar average (so it does not catch a falling
 * knife in a real crash), then selling the bounce back to the middle band
 * harvests that snap-back. This is the validated ETH mean-reversion recipe from
 * the ledger, with ATR-scaled sizing PLUS an ATR trailing stop so a bounce that
 * stalls short of the middle band still locks in profit instead of giving it back.
 * When it buys and sells: it buys when price closes below the 20-bar lower
 * Bollinger band with RSI below 35 and price above the 200-bar average. It sells
 * when price returns to the middle band, RSI climbs above 60, or price falls 2.5
 * ATR below the highest close since entry (trailing stop). Size is scaled by ATR.
 * When it does NOT work: in a strong melt-up it sits in cash and badly lags
 * buy-and-hold (defensive by design). In a sustained bear it rarely buys because
 * price stays below the 200-bar average. In a choppy period a bounce that never
 * reaches the band can be stopped out at a small loss.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const atr = ctx.atr(14, 1);
  const px = ctx.closes[ctx.closes.length - 2];
  if (bb == null || bb.lower == null || rsi == null || sma200 == null || atr == null || px == null) return null;

  if (ctx.position > 0) {
    // Track the highest close since entry to trail profit from it.
    const entryIdx = ctx.i - 1;
    let hi = -Infinity;
    for (let k = 1; k <= Math.min(200, entryIdx); k++) {
      const c = ctx.closes[ctx.closes.length - 1 - k];
      if (c > hi) hi = c;
    }
    // Exit on mid-band bounce, RSI overbought, or a 2.5-ATR pullback from the peak.
    // 2.5 ATR: tight enough to protect a stall, loose enough not to shake out a real bounce.
    const trailStop = hi - 2.5 * atr;
    if (px >= bb.mid || rsi > 60 || px <= trailStop) return { side: 'sell', qty: ctx.position };
    return null;
  }

  if (px <= bb.lower && rsi < 35 && px > sma200) {
    // ATR-scaled size: risk 2% of equity on a 2-ATR stop distance, so higher
    // volatility automatically shrinks the position (validated champion sizing).
    const equity = ctx.cash + ctx.position * ctx.price;
    const stopDist = 2 * atr;
    const qty = Math.max(0, Math.min((equity * 0.02) / stopDist, (ctx.cash / ctx.price) * 0.95));
    if (qty > 0) return { side: 'buy', qty: qty };
  }
  return null;
}
