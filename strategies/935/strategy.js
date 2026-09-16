/*
 * @coinsori-strategy v1
 * name: Multi-Asset MACD with Macro Sentiment Filter
 * ex: binanceusdm
 * syms: BTCUSDT ETHUSDT ADAUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: Combines MACD crossovers across multiple assets to identify strong momentum shifts, while filtering for macro sentiment to avoid trades during high fear or extreme greed periods.
 * When it buys and sells: Buys when a MACD crossover occurs on any asset AND the macro sentiment is not in fear or greed zones (i.e., neutral range), selling when the opposite happens.
 * When it does NOT work: This strategy may underperform in strongly trending markets where all assets are in the same direction, or during high volatility times without clear sentiment signals.
 */

function onUpdate(ctx) {
  // Define MACD parameters
  const fast = 12;
  const slow = 26;
  const signal = 9;

  // Fetch macro sentiment data (fear/greed index)
  const fearGreed = ctx.data('fear_greed');
  if (fearGreed == null) return null;

  // Define sentiment thresholds
  // For our strategy, we want to avoid trading when fear (0-20) or greed (80-100)
  const fearThreshold = 20;
  const greedThreshold = 80;

  // Only trade if market is in neutral zone (20-80)
  if (fearGreed <= fearThreshold || fearGreed >= greedThreshold) {
    // If we are in a fear or greed zone, return null to do nothing
    return null;
  }

  // Track whether any asset shows a strong MACD crossover (1 = long, -1 = short)
  let tradeSignal = 0;

  // Loop through each symbol and check for MACD signal
  for (const sym of ctx.syms) {
    const prevMacd = ctx.macd(fast, slow, signal, 1);
    const currMacd = ctx.macd(fast, slow, signal, 0);

    if (prevMacd == null || currMacd == null || currMacd.signal == null || prevMacd.signal == null) continue;

    // Buy if MACD crosses above signal line
    if ((prevMacd.macd <= prevMacd.signal && currMacd.macd > currMacd.signal)) {
      tradeSignal = 1;
      break; // Only need one asset to trigger a buy
    }

    // Sell if MACD crosses below signal line
    if (prevMacd.macd >= prevMacd.signal && currMacd.macd < currMacd.signal) {
      tradeSignal = -1;
      break; // Only need one asset to trigger a sell
    }
  }

  // If any symbol triggers a buy or sell signal, execute the trade
  if (tradeSignal === 1 && ctx.position === 0) {
    // Allocate full cash to buy one of the assets
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  if (tradeSignal === -1 && ctx.position > 0) {
    // Close all positions with a sell order
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
