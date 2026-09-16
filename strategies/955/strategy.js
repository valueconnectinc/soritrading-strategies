/*
 * @coinsori-strategy v1
 * name: Macro Filtered MACD-RSI Strategy
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: Combines MACD and RSI signals with macro sentiment filter (Fear & Greed Index) to avoid trades during high volatility periods.
 * When it buys and sells: Buys when MACD crosses above signal line and RSI is below 50 (downtrend), with fear/greed index below 50 (fear). Sells when MACD crosses below signal and RSI is above 50 (uptrend) with fear/greed index above 50 (greed).
 * When it does NOT work: In extremely volatile or unpredictable market conditions where macro sentiment gives misleading signals.
 */

function onUpdate(ctx) {
  // Get indicators
  const macd = ctx.macd(12, 26, 9, 0);
  const macd_prev = ctx.macd(12, 26, 9, 1);
  const rsi = ctx.rsi(14, 0);
  const rsi_prev = ctx.rsi(14, 1);

  // Check if indicators are valid
  if (macd == null || macd_prev == null || rsi == null || rsi_prev == null) {
    return null;
  }

  // Get macro sentiment filter (Fear & Greed Index)
  // Using data key 'fear_greed_index' which was found in datasets
  const fearGreed = ctx.data('fear_greed_index');
  
  // If we don't have the macro data, we can't make a decision
  if (fearGreed == null) {
    return null;
  }

  // Trend filter using SMA50
  const sma50 = ctx.sma(50, 0);
  const sma50_prev = ctx.sma(50, 1);
  
  if (sma50 == null || sma50_prev == null) {
    return null;
  }
  
  // Determine trend: 1 = upward, -1 = downward
  const trend = sma50 > sma50_prev ? 1 : -1;

  // Buy condition: MACD crossed above signal and RSI < 50 (downtrend) and fear sentiment
  if (macd_prev.macd <= macd_prev.signal && macd.macd > macd.signal && rsi < 50 && fearGreed < 50 && trend > 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Sell condition: MACD crossed below signal and RSI > 50 (uptrend) and greed sentiment
  if (macd_prev.macd >= macd_prev.signal && macd.macd < macd.signal && rsi > 50 && fearGreed > 50 && trend < 0) {
    return { side: 'sell', qty: ctx.position };
  }

  // No action
  return null;
}
