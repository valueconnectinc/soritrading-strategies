/*
 * @coinsori-strategy v1
 * name: Moving Average Crossover with Volume Filter
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy leverages the crossover of short-term and long-term moving averages to identify trend changes, filtering trades based on volume to ensure higher confidence in the signal. It is designed to capture trending movements while reducing false signals in low-volume periods.
 * When it buys and sells: The strategy enters a long position when the 10-period SMA crosses above the 50-period SMA and the current volume exceeds the average volume over the last 20 periods. It exits the position when the 10-period SMA crosses below the 50-period SMA.
 * When it does NOT work: This strategy may underperform in highly volatile or ranging markets where price movements are inconsistent, or when volume filters are too restrictive, missing profitable opportunities.
 */

function onUpdate(ctx) {
  // Get moving averages
  const smaShort = ctx.sma(10);
  const smaLong = ctx.sma(50);
  
  // Get current and previous values for crossover detection
  const smaShort1 = ctx.sma(10, 1);
  const smaLong1 = ctx.sma(50, 1);
  
  // Get volume data
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(20);
  
  // Check if all required indicators are available
  if (smaShort == null || smaLong == null || smaShort1 == null || smaLong1 == null || vol == null || avgVol == null) {
    return null;
  }
  
  // Buy condition: SMA short crosses above SMA long, volume is above average
  if (smaShort1 <= smaLong1 && smaShort > smaLong && vol > avgVol) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  
  // Sell condition: SMA short crosses below SMA long
  if (smaShort1 >= smaLong1 && smaShort < smaLong) {
    return { side: 'sell', qty: ctx.position };
  }
  
  return null;
}
