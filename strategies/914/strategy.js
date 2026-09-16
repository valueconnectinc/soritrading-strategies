/*
 * @coinsori-strategy v1
 * name: MACD Trend Filter Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * This strategy combines MACD trend filtering with mean reversion logic to trade during downtrends.
 * It enters long positions when price is near the lower Bollinger Band and MACD shows bullish crossover,
 * while exiting short positions (if any) or entering longs if market conditions match.
 * The trend filter helps reduce false signals in strong uptrends, focusing on mean reversion opportunities
 * during downtrends. It does not work well in strong uptrends where there are no mean reversion
 * opportunities.
 */
function onUpdate(ctx) {
  const { price, position } = ctx;

  // Fetch indicator values
  const macd = ctx.macd(12, 26, 9, 0);
  const macdPrev = ctx.macd(12, 26, 9, 1);
  const bb = ctx.bb(20, 2.0, 0); // Bollinger Bands with 20-period SMA and 2.0 std deviation
  const bbPrev = ctx.bb(20, 2.0, 1);  
  const rsi = ctx.rsi(14, 0);
  const rsiPrev = ctx.rsi(14, 1);

  // Guard against null values
  if (macd == null || macdPrev == null || bb == null || bbPrev == null || rsi == null || rsiPrev == null) {
    return null;
  }

  // --- TREND FILTER ---
  // If the MACD is in a positive trend, do NOT enter positions — only trade during downtrend
  const isInPositiveTrend = macd.macd > 0 && macdPrev.macd > 0;

  // Signal: Buy when price nears lower Bollinger Band and RSI is low (oversold)
  const isBuySignal = price <= bb.lower &&
                      rsi < 30 &&
                      rsiPrev >= rsi; // RSI is rising (indicating reversal)

  // Signal: Sell when price nears upper Bollinger Band and RSI is high (overbought)
  const isSellSignal = price >= bb.upper &&
                       rsi > 70 &&
                       rsiPrev <= rsi; // RSI is falling (indicating reversal)

  // --- ENTRY LOGIC ---
  if (isInPositiveTrend) {
    // In strong uptrend, we do not want to go long
    return null;
  }

  if (isBuySignal && position === 0) {
    // Enter a long position only when no existing position
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }

  if (isSellSignal && position > 0) {
    // Exit long position if it's a sell signal
    return { side: 'sell', qty: position };
  }

  return null;
}
