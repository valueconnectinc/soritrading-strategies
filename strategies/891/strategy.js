/*
 * @coinsori-strategy v1
 * name: RSI + ATR Volatility Filter Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy combines RSI for momentum and ATR for volatility to avoid trades during low-volatility periods where price movements might be insignificant.
 * When it buys and sells: It buys when RSI is below 30 (oversold) and ATR is above its average. It sells when RSI is above 70 (overbought).
 * When it does NOT work: This strategy may not work well during strong trending markets where volatility is low, as it might miss significant moves.
 */
function onUpdate(ctx) {
  // Get RSI and ATR values
  const rsi = ctx.rsi(14, 0);
  const atr = ctx.atr(14, 0);

  // Guard against null values
  if (rsi == null || atr == null) return null;

  // Use a simple average of ATR over the last 20 periods
  let avgAtr = 0;
  for (let i = 0; i < 20; i++) {
    const a = ctx.atr(14, i);
    if (a != null) {
      avgAtr += a;
    }
  }
  avgAtr /= 20;

  // Buy condition: RSI below 30 and ATR above average
  if (rsi < 30 && atr > avgAtr) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Sell condition: RSI above 70
  if (rsi > 70) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
