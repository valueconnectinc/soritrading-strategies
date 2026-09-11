/*
 * @coinsori-strategy v1
 * name: External Data RSI Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy incorporates external fear and greed index data to adjust RSI-based buy/sell signals, aiming to improve performance during volatile market conditions.
 * When it buys and sells: It buys when the RSI crosses below 30 and the fear/greed index indicates a low sentiment. It sells when RSI crosses above 70 and the fear/greed index indicates high sentiment.
 * When it does NOT work: This strategy may underperform during consistently upward or downward trends where the fear/greed index does not provide clear signals.
 */

function onUpdate(ctx) {
  // Check if data is available
  const fearGreed = ctx.data('fg');
  if (fearGreed == null) return null;

  // Get RSI indicator
  const rsi = ctx.rsi(14);
  if (rsi == null) return null;

  // Define buy and sell conditions
  const buyCondition = rsi < 30 && fearGreed < 50; // RSI below 30 and fear/greed index low
  const sellCondition = rsi > 70 && fearGreed > 50; // RSI above 70 and fear/greed index high

  // Place orders based on conditions
  if (buyCondition && ctx.position <= 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  } else if (sellCondition && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
