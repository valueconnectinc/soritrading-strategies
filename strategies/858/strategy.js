/*
 * @coinsori-strategy v1
 * name: MACD Trend Following with ATR Stop
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * This strategy uses MACD crossovers to identify trend direction and ATR-based stops to manage risk. It enters long when the MACD line crosses above the signal line, and exits based on ATR trailing stop.
 * The strategy buys on uptrend confirmation and sells when price falls below the dynamic ATR-based stop level.
 * This approach may struggle during choppy or sideways markets, where false signals occur frequently. It is also sensitive to high volatility periods, which can lead to premature exits.
 */
function onUpdate(ctx) {
  // === INDICATORS ===
  const macd = ctx.macd(12, 26, 9, 0);
  const macdPrev = ctx.macd(12, 26, 9, 1);
  const atr = ctx.atr(14, 0);
  const atrPrev = ctx.atr(14, 1);

  // === GUARD AGAINST NULL VALUES ===
  if (macd == null || macdPrev == null || atr == null || atrPrev == null) {
    return null;
  }

  // === LONG POSITION LOGIC ===
  // Buy when MACD crosses above signal line (trend confirmation)
  if (macdPrev.macd <= macdPrev.signal && macd.macd > macd.signal) {
    const qty = ctx.cash / ctx.price * 0.99;
    return {
      side: 'buy',
      qty: qty,
      type: 'market'
    };
  }

  // === EXIT LOGIC ===
  // Check if we are in a long position and set trailing stop using ATR
  if (ctx.position > 0) {
    const stopPrice = ctx.price - (atr * 1.5); // ATR-based dynamic stop
    if (ctx.price < stopPrice) {
      return {
        side: 'sell',
        qty: ctx.position
      };
    }
  }

  return null;
}
