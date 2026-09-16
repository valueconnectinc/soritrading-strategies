/*
 * @coinsori-strategy v1
 * name: MACD-RSI Mean Reversion Strategy with Volatility Filter - Enhanced
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 1000
 *
 * This is an enhanced version of the previous strategy that includes additional filters and adjusted parameters. The goal is to improve performance by reducing false signals and increasing robustness in various market conditions.
 * The strategy buys when MACD crosses above its signal line while RSI is below 30 (oversold), and sells when MACD crosses below its signal line while RSI is above 70 (overbought).
 * It includes a volatility filter based on ATR, as well as a confirmation of price action to avoid false signals.
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
  const volatilityThreshold = 50;  // Adjusted for BTC price level
  if (atr == null || atr < volatilityThreshold) {
    return null;
  }

  // Price action confirmation
  const priceConfirmed = (prevClose > close) ? true : false;

  // Buy condition: MACD crosses above signal line and RSI is oversold (<30), and price action is confirmed
  if (macdPrev == null || macd.signal == null || macdPrev.signal == null) return null;
  
  const buyCondition = (macdPrev.signal > macdPrev.macd) && (macd.signal < macd.macd) && (rsi < 30) && priceConfirmed;
  
  // Sell condition: MACD crosses below signal line and RSI is overbought (>70), and price action is confirmed
  const sellCondition = (macdPrev.signal < macdPrev.macd) && (macd.signal > macd.macd) && (rsi > 70) && priceConfirmed;

  if (buyCondition) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  if (sellCondition && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
