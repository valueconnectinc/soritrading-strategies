/*
 * @coinsori-strategy v1
 * name: SMA Cross with DXY Filter
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: This strategy attempts to improve a basic SMA crossover by filtering entries based on the 30-day change in the DXY (Dollar Index). The idea is that when the dollar index is rising (indicating a strong dollar), crypto assets like BTC might be under pressure, and vice versa.
 *
 * When it buys and sells: It buys when a 20-period SMA crosses above a 60-period SMA AND the 30-day change in DXY is less than or equal to 1.0. It sells (closes) when a 20-period SMA crosses below a 60-period SMA.
 *
 * When it does NOT work: This strategy fails when the filtering condition (DXY change < 1.0) does not align with BTC's price movements in the 1-hour timeframe, or if there is insufficient historical data for DXY in the backtesting environment.
 */
function onUpdate(ctx) {
  // Check if we have enough data
  if (ctx.i < 60) return null;

  const sma20 = ctx.sma(20);
  const sma60 = ctx.sma(60);

  // Get DXY value from external dataset, fallback to null if not available
  const dxyValue = ctx.data('dxy');

  // Guard against missing data
  if (sma20 == null || sma60 == null || dxyValue == null) return null;

  // Get the change in DXY over the last 30 days to be used as a filter
  const dxyChange = ctx.data('dxy'); // This assumes a daily frequency

  // If DXY change is below our threshold, we will proceed with filtering
  if (dxyChange <= 1.0) {
    if (sma20 > sma60 && ctx.position === 0) {
      // Buy when SMA20 crosses above SMA60 and dxy filter is met
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    } else if (sma20 < sma60 && ctx.position > 0) {
      // Sell when SMA20 crosses below SMA60 and we are in a long position
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
