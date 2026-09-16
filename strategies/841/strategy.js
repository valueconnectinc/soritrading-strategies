/*
 * @coinsori-strategy v1
 * name: RSI Mean Reversion with Volatility Filter
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses the RSI indicator to identify overbought and oversold conditions,
 * combined with a volatility filter to avoid trading during low-volatility periods. It exploits mean reversion
 * in price movements by buying when RSI is oversold and selling when RSI is overbought.
 * When it buys and sells: It buys when RSI crosses below the oversold threshold (30) and volatility is high,
 * and sells when RSI crosses above the overbought threshold (70).
 * When it does NOT work: It does not work well during strong trending markets where prices remain
 * in overbought or oversold conditions for extended periods, leading to frequent false signals.
 */

function onUpdate(ctx) {
  // Constants for RSI and ATR periods
  const rsiPeriod = 14;
  const atrPeriod = 14;

  // Calculate RSI values
  const rsiValue = ctx.rsi(rsiPeriod, 0);

  // Calculate ATR for volatility filtering
  const atrValue = ctx.atr(atrPeriod, 0);

  // Check if we have enough data to trade
  if (rsiValue == null || atrValue == null) return null;

  // Define RSI thresholds
  const overbought = 70;
  const oversold = 30;

  // Volatility threshold — trade only when volatility is above the previous bar's ATR
  const volatilityThreshold = ctx.atr(atrPeriod, 1);

  // If volatility is below the threshold, do not trade
  if (atrValue <= volatilityThreshold) return null;

  // Buy condition: RSI crosses below oversold level
  const prevRsi = ctx.rsi(rsiPeriod, 1);
  if (prevRsi == null) return null;

  if (prevRsi >= oversold && rsiValue < oversold) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Sell condition: RSI crosses above overbought level
  if (prevRsi <= overbought && rsiValue > overbought) {
    // Close position if there is one, otherwise do nothing
    if (ctx.position > 0) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  // Do nothing if no condition is met
  return null;
}
