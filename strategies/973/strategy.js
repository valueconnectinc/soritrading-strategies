/*
 * @coinsori-strategy v1
 * name: Improved Bollinger Band Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * This strategy improves upon the basic Bollinger Band mean reversion by incorporating a volatility filter.
 * It only enters trades when the ATR (Average True Range) exceeds a certain threshold, to avoid low-volatility markets where mean reversion may not be effective.
 * The strategy aims to reduce false signals and improve risk-adjusted returns.
 *
 * When it buys: The price touches the lower Bollinger Band and volatility (ATR) is above threshold, suggesting a strong potential for mean reversion.
 * When it sells: The price touches the upper Bollinger Band and volatility (ATR) is above threshold, suggesting a strong potential for mean reversion.
 * When it does NOT work: During low-volatility periods or in strong trending markets where mean reversion is unlikely to occur.
 */

function onUpdate(ctx) {
  // Bollinger Band parameters
  const bbPeriod = 20;
  const bbMultiplier = 2;

  // ATR parameters for volatility filter
  const atrPeriod = 14;

  // Volatility threshold (ATR value)
  const volatilityThreshold = 100; // Adjust based on asset and market conditions

  // Get the current Bollinger Band values
  const bb = ctx.bb(bbPeriod, bbMultiplier, 0);  // Current (closed) bar
  if (bb == null) return null;

  // Get the current ATR value for volatility filter
  const atr = ctx.atr(atrPeriod, 0);
  if (atr == null) return null;

  // Check if we are already in a position
  if (ctx.position != 0) {
    // If we have a position, check for exit conditions
    // Exit if we're close to the middle band (mean reversion)
    const currentPrice = ctx.price;
    const middleBand = bb.middle;
    
    // Define thresholds for exiting - close to middle band
    const exitThreshold = 0.01;  // 1% threshold
    
    if (Math.abs(currentPrice - middleBand) / middleBand < exitThreshold) {
      return { side: 'sell', qty: ctx.position };  // Close the position
    }
    
    return null;  // No action if not exiting
  }

  // If no open position, check for entry conditions
  const currentPrice = ctx.price;
  const upperBand = bb.upper;
  const lowerBand = bb.lower;

  // Only enter trade if volatility is above threshold
  if (atr < volatilityThreshold) {
    return null;  // Do not enter trade if volatility is too low
  }

  // Buy when price touches (or goes below) the lower band
  if (currentPrice <= lowerBand) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };  // Enter long position
  }

  // Sell when price touches (or goes above) the upper band
  if (currentPrice >= upperBand) {
    return { side: 'sell', qty: ctx.position };  // Close any existing position (if any)
  }

  return null;  // No action
}
