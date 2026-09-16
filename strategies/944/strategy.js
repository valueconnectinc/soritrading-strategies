/*
 * @coinsori-strategy v1
 * name: MACD-RSI Mean Reversion Strategy with Volatility Filter - Final
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 1000
 *
 * This is the final version of the strategy. We adjusted the parameters and filters to make it more robust.
 * Buy condition: MACD crosses above signal line and RSI is below 30 (oversold).
 * Sell condition: MACD crosses below signal line and RSI is above 70 (overbought).
 * ATR volatility filter is applied, and we also add a price confirmation to improve signal quality.
 * This strategy does not work well during very flat market conditions or when there is a lack of clear momentum.
 */

function onUpdate(ctx) {
  // Indicator values
  const macd = ctx.macd(12, 26, 9, 0);
  const macdPrev = ctx.macd(12, 26, 9, 1);
  const rsi = ctx.rsi(14, 0);
  const rsiPrev = ctx.rsi(14, 1);
  const atr = ctx.atr(14, 0);
  const close = ctx.price;
  const prevClose = ctx.closes[1];

  // Volatility filter: if ATR is below a certain threshold, do not trade
  const volatilityThreshold = 30;  // Adjusted for BTC price level
  if (atr == null || atr < volatilityThreshold) {
    return null;
  }

  // Price action confirmation - ensure price is rising when buying and falling when selling
  const buyPriceConfirmed = (prevClose < close) ? true : false;
  const sellPriceConfirmed = (prevClose > close) ? true : false;

  // Buy condition: MACD crosses above signal line and RSI is oversold (<30), price is rising
  if (macdPrev == null || macd.signal == null || macdPrev.signal == null) return null;
  
  const buyCondition = (macdPrev.signal > macdPrev.macd) && (macd.signal < macd.macd) && (rsi < 30) && buyPriceConfirmed;
  
  // Sell condition: MACD crosses below signal line and RSI is overbought (>70), price is falling
  const sellCondition = (macdPrev.signal < macdPrev.macd) && (macd.signal > macd.macd) && (rsi > 70) && sellPriceConfirmed;

  if (buyCondition) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  if (sellCondition && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
