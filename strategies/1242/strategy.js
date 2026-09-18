/*
 * @coinsori-strategy v1
 * name: Bollinger Band Mean Reversion — BTCUSDT 1H
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Mean-reversion bet: BTC tends to bounce off the lower Bollinger Band when
 * oversold. Buy when price touches the lower band AND RSI < 35 (double
 * confirmation of oversold). Sell when price reaches the middle band or RSI > 65.
 * Works in ranging/choppy markets. Fails in strong sustained trends where
 * the lower band touch keeps dipping — the "falling knife" problem.
 */
function onUpdate(ctx) {
  const position = ctx.position;
  const price    = ctx.price;

  // === BOLLINGER BANDS (20, 2) ===
  const bb = ctx.bb(20, 2);
  if (bb == null) return null;
  const lower = bb.lower;
  const mid   = bb.mid;
  const upper = bb.upper;

  // === RSI(14) ===
  const rsi = ctx.rsi(14);
  if (rsi == null) return null;

  // === ENTRY: price at/below lower band + RSI oversold ===
  if (!position) {
    const touchLower = price <= lower;
    const rsiOversold = rsi < 35;

    if (touchLower && rsiOversold) {
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  // === EXIT: price at/above middle band OR RSI overbought ===
  if (position) {
    const reachMid   = price >= mid;
    const rsiOverbought = rsi > 65;

    if (reachMid || rsiOverbought) {
      return { side: 'sell', qty: position };
    }
  }

  return null;
}
