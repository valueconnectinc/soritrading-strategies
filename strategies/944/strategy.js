/*
 * @coinsori-strategy v1
 * name: MACD-RSI Mean Reversion Strategy with Volatility Filter - Improved
 * ex: bybit
 * syms: BTC
 * interval: 1h
 * cash: 1000
 *
 * This strategy is an improved version of the previous MACD-RSI mean reversion approach, incorporating a volatility filter based on ATR. It aims to reduce false signals and improve performance by filtering out trades in low-volatility conditions.
 * The strategy buys when MACD crosses above its signal line while RSI is below 30 (oversold), and sells when MACD crosses below its signal line while RSI is above 70 (overbought).
 * It avoids trading in low volatility periods to improve trade quality.
 * This strategy does not work well during very flat market conditions or when there is a lack of clear momentum.
 */

function onUpdate(ctx) {
  // Indicator values
  const macd = ctx.macd(12, 26, 9, 0);
  const macdPrev = ctx.macd(12, 26, 9, 1);
  const rsi = ctx.rsi(14, 0);
  const rsiPrev = ctx.rsi(14, 1);
  const atr = ctx.atr(14, 0);

  // Volatility filter: if ATR is below a certain threshold, do not trade
  const volatilityThreshold = 100;  // Adjust based on coin price level (e.g., for BTC)
  if (atr == null || atr < volatilityThreshold) {
    return null;
  }

  // Buy condition: MACD crosses above signal line and RSI is oversold (<30)
  if (macdPrev == null || macd.signal == null || macdPrev.signal == null) return null;
  
  const buyCondition = (macdPrev.signal > macdPrev.macd) && (macd.signal < macd.macd) && (rsi < 30);
  
  // Sell condition: MACD crosses below signal line and RSI is overbought (>70)
  const sellCondition = (macdPrev.signal < macdPrev.macd) && (macd.signal > macd.macd) && (rsi > 70);

  if (buyCondition) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  if (sellCondition && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
