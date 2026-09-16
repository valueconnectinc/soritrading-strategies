/*
 * @coinsori-strategy v1
 * name: Trend Following with ATR Stop
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy exploits trending markets by entering long positions when price breaks above a moving average and exiting with an ATR-based trailing stop to capture gains.
 * When it buys and sells: It buys when price crosses above the 20-period EMA and closes position when ATR trailing stop is hit.
 * When it does NOT work: This strategy underperforms in ranging markets where price oscillates without a clear trend, or during high volatility spikes that trigger early exits.
 */

function onUpdate(ctx) {
  // === INDICATORS ===
  const ema20 = ctx.ema(20, 0);          // 20-period EMA for trend
  const ema50 = ctx.ema(50, 0);          // 50-period EMA, secondary filter
  const atr14 = ctx.atr(14, 0);          // 14-period ATR for stop calculation
  const ma200 = ctx.sma(200, 0);         // 200-period SMA for trend confirmation

  // === SAFETY GUARDS ===
  if (ema20 == null || ema50 == null || atr14 == null || ma200 == null) {
    return null; // Not enough data to proceed
  }

  // === POSITION LOGIC ===
  const currentPrice = ctx.price;
  const position = ctx.position;
  const entryPx = ctx.entryPx;

  // Buy condition: Price breaks above EMA20 and EMAs are in correct order
  const buyCondition = (
    currentPrice > ema20 &&
    ema20 > ema50 &&                 // Confirmation of uptrend
    currentPrice > ma200              // Price above long-term moving average
  );

  // Sell condition: ATR trailing stop is hit (when in position)
  const sellCondition = (
    position > 0 &&
    (entryPx + atr14 * 1.5) > currentPrice  // Stop loss based on ATR
  );

  if (buyCondition && position <= 0) {
    return { side: 'buy', qty: ctx.cash / currentPrice * 0.95 }; // Buy 95% of available cash
  }

  if (sellCondition) {
    return { side: 'sell', qty: position }; // Sell entire position
  }

  return null; // Do nothing
}
