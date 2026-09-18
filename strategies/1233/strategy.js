/*
 * @coinsori-strategy v1
 * name: RSI Momentum Tight — Multi 1H
 * ex: binance
 * syms: BTCUSDT, SOLUSDT, BNBUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: Tighter RSI thresholds (40/60) enter earlier in a move and exit before reversal, capturing more of short-term swings in a choppy market.
 * When it buys and sells: Buy when RSI(14) crosses above 40 (oversold bounce confirmed). Sell when RSI crosses below 60 (overbought territory exited).
 * When it does NOT work: In slow grinding trends — tighter thresholds cause earlier exits that leave money on the table. Also prone to whipsaws in sideways markets.
 */
function onUpdate(ctx) {
  const rsi   = ctx.rsi(14);
  const rsi_1 = ctx.rsi(14, 1);
  if (rsi == null || rsi_1 == null) return null;

  const position = ctx.position;

  // BUY: RSI crosses above 40 (oversold bounce)
  const rsiBullCross = rsi_1 < 40 && rsi >= 40;
  if (rsiBullCross && position === 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // SELL: RSI crosses below 60 (overbought exit)
  const rsiBearCross = rsi_1 >= 60 && rsi < 60;
  if (rsiBearCross && position > 0) {
    return { side: 'sell', qty: position };
  }

  return null;
}
