/*
 * @coinsori-strategy v1
 * name: Combining Multiple Indicators for Trading Signals
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy combines multiple technical indicators (SMA, RSI, MACD) to generate more reliable buy and sell signals. By using multiple filters, we aim to reduce false signals commonly seen with single indicator strategies.
 * When it buys and sells: The strategy buys when SMA crossover occurs (5-day above 20-day), RSI is below 40 (oversold), and MACD is bullish. It sells when SMA crossover occurs (5-day below 20-day), RSI is above 60 (overbought), and MACD is bearish.
 * When it does NOT work: This strategy may fail during very strong trending markets where price moves rapidly without retracing, or in ranging markets where multiple indicators do not align consistently.
 */

function onUpdate(ctx) {
  // Get indicators
  const sma5 = ctx.sma(5);
  const sma20 = ctx.sma(20);
  const rsi = ctx.rsi(14);
  const macd = ctx.macd(12, 26, 9);

  // Guard against null values
  if (sma5 == null || sma20 == null || rsi == null || macd == null) return null;

  // Get MACD values
  const macdLine = macd.macd;
  const signalLine = macd.signal;

  // Buy condition: SMA crossover (bullish) + RSI oversold (<40) + MACD bullish
  if (sma5 > sma20 && rsi < 40 && macdLine > signalLine) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Sell condition: SMA crossover (bearish) + RSI overbought (>60) + MACD bearish
  if (sma5 < sma20 && rsi > 60 && macdLine < signalLine) {
    // Only sell if we have a position
    if (ctx.position > 0) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
