/*
 * @coinsori-strategy v1
 * name: XRP Band Bounce
 * ex: binance
 * syms: XRPUSDT
 * interval: 4h
 * cash: 1000
 *
 * Bollinger Band mean reversion on a liquid alt. Bet: liquid altcoins tend to
 * snap back toward the middle band after touching the lower band when RSI is
 * oversold, and to fade back from the upper band when RSI is overbought.
 * When it buys: price touches the lower Bollinger band while RSI is oversold
 * (< 35). When it sells: price reaches the middle band or RSI turns overbought
 * (> 65), or a hard stop protects against a real breakdown.
 * When it does NOT work: strong one-way trends where price keeps pushing
 * through the lower band (falling knife) or keeps running above the upper band
 * (leaves money on the table by exiting too early). A hard stop limits the
 * falling-knife case.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  if (bb == null || rsi == null) return null;
  const px = ctx.price;
  if (px == null) return null;

  const pos = ctx.position || 0;
  const entry = ctx.entryPx || 0;

  // Hard stop: exit if price fell 12% below entry (real breakdown, not a bounce)
  if (pos > 0 && entry > 0 && px < entry * 0.88) {
    return { side: 'sell', qty: pos };
  }

  // Buy at lower band with oversold RSI
  if (pos === 0 && px <= bb.lower && rsi < 35) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Exit at middle band or overbought RSI
  if (pos > 0 && (px >= bb.mid || rsi > 65)) {
    return { side: 'sell', qty: pos };
  }

  return null;
}
