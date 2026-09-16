/*
 * @coinsori-strategy v1
 * name: Volatility Swing Trading Strategy
 * ex: binanceusdm
 * syms: ETHUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses volatility (ATR) to identify potential swing trade opportunities. When volatility increases significantly, it indicates a strong move is likely, and we enter a position with the expectation of capturing that move.
 * When it buys and sells: It buys when price breaks above a recent high and ATR value rises significantly. It sells when price breaks below a recent low and ATR value rises significantly.
 * When it does NOT work: This strategy struggles in ranging or low volatility markets, where there are no clear swing trade opportunities, potentially leading to frequent losses from false breakouts.
 */

function onUpdate(ctx) {
  // Get the indicators
  const atr = ctx.atr(14, 0);
  const prevAtr = ctx.atr(14, 1);

  const price = ctx.price;
  const prevPrice = ctx.closes[1];

  // Get recent highs and lows for swing trading logic
  const high_10 = ctx.high(10, 0);
  const low_10 = ctx.low(10, 0);
  const prevHigh_10 = ctx.high(10, 1);
  const prevLow_10 = ctx.low(10, 1);

  // Initialize return object
  let order = null;

  // Make sure we have all required values to proceed
  if (!atr || !prevAtr || !high_10 || !low_10 || !prevHigh_10 || !prevLow_10) {
    return null;
  }

  // Volatility threshold for breakout conditions (adjustable)
  const volThreshold = prevAtr * 1.5;

  // Breakout logic
  // Buy condition: price breaks above recent high and ATR is significantly higher
  if (price > high_10 && prevPrice <= prevHigh_10 &&
      atr > volThreshold) {
    
    order = { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Sell condition: price breaks below recent low and ATR is significantly higher
  if (price < low_10 && prevPrice >= prevLow_10 &&
      atr > volThreshold) {
    
    order = { side: 'sell', qty: ctx.position };
  }

  return order;
}
