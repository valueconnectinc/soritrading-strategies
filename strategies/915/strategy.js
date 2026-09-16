/*
 * @coinsori-strategy v1
 * name: BB-MACD Hybrid Strategy v3
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy:
 * This simplified hybrid strategy uses Bollinger Bands for mean reversion signals and MACD for trend filtering.
 * It's designed to be more responsive than previous versions to market changes.
 *
 * When it buys and sells:
 * Buys when price touches lower BB band and MACD shows bullish momentum (crossing above signal line).
 * Sells when price touches upper BB band and MACD shows bearish momentum (crossing below signal line).
 * Uses simple trend confirmation from previous bar's MACD to avoid false signals.
 *
 * When it does NOT work:
 * This strategy fails during strong, sustained trends where mean reversion is not effective,
 * and in low-volatility periods where Bollinger Bands do not provide clear signals.
 */
function onUpdate(ctx) {
  // Get indicator values
  const bb = ctx.bb(20, 2); // 20-period BB with 2 std devs
  const macd = ctx.macd(12, 26, 9); // MACD with standard settings

  // Check if indicators are valid (not null)
  if (bb == null || macd == null || bb.upper == null || bb.middle == null || bb.lower == null) {
    return null;
  }

  // Calculate price levels for signals
  const price = ctx.price;
  const upperBand = bb.upper;
  const lowerBand = bb.lower;

  // Check MACD values (MACD line and signal line)
  const macdLine = macd.macd;
  const signalLine = macd.signal;

  // Guard clause for valid MACD data
  if (macdLine == null || signalLine == null) {
    return null;
  }

  // Historical MACD values for trend detection (previous bar data)
  const prevMacd = ctx.macd(12, 26, 9, 1); // Previous bar's MACD
  const prevSignal = ctx.macd(12, 26, 9, 1)?.signal; // Previous bar's signal

  // Guard clause for previous MACD data
  if (prevMacd == null || prevSignal == null) {
    return null;
  }

  // Position management
  const position = ctx.position;

  // Buy condition: price touches lower BB and crosses above signal line (bullish crossover)
  if (price <= lowerBand && macdLine > signalLine && prevMacd <= prevSignal) {
    // Check if already in a long position
    if (position > 0) return null; // Already long, no action

    // Calculate quantity to buy (99% of available cash)
    const qty = ctx.cash / price * 0.99;
    return { side: 'buy', qty: qty };
  }

  // Sell condition: price touches upper BB and crosses below signal line (bearish crossover)
  if (price >= upperBand && macdLine < signalLine && prevMacd >= prevSignal) {
    // Check if already in a short position
    if (position < 0) return null; // Already short, no action

    // Calculate quantity to sell (close the entire position)
    const qty = Math.abs(position);
    return { side: 'sell', qty: qty };
  }

  // Exit condition: if currently long and price crosses above middle BB
  if (position > 0 && price >= bb.middle) {
    // Close the long position
    const qty = position;
    return { side: 'sell', qty: qty };
  }

  // Exit condition: if currently short and price crosses below middle BB
  if (position < 0 && price <= bb.middle) {
    // Close the short position
    const qty = Math.abs(position);
    return { side: 'buy', qty: qty };
  }

  // No action otherwise
  return null;
}
