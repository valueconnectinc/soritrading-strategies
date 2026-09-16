/*
 * @coinsori-strategy v1
 * name: Bollinger Band Mean Reversion
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000

 * Why this strategy: This strategy uses Bollinger Bands to identify overbought and oversold conditions. When the price touches or crosses the lower band, it's considered an oversold condition and a buy signal is generated. When it crosses the upper band, it's considered overbought and a sell signal is generated.
 * When it buys and sells: It buys when the price touches the lower Bollinger Band and sells when it touches the upper Bollinger Band as a mean reversion signal.
 * When it does NOT work: This strategy may fail in strong trending markets where prices remain consistently in overbought or oversold conditions for extended periods. It also doesn't account for sudden market shocks that can rapidly change trend directions.
 */

function onUpdate(ctx) {
  // Get Bollinger Band values
  const bb = ctx.bb(20, 2, 0);
  const bbPrev = ctx.bb(20, 2, 1);
  
  // Guard against null values
  if (bb == null || bbPrev == null) {
    return null;
  }

  // Get price data
  const price = ctx.price;
  const prevPrice = ctx.closes[1];

  if (price == null || prevPrice == null) {
    return null;
  }

  // Buy when price touches or crosses the lower Bollinger Band
  const buyCondition = (prevPrice <= bbPrev.lower) && (price > bb.lower);

  // Sell when price touches or crosses the upper Bollinger Band
  const sellCondition = (prevPrice >= bbPrev.upper) && (price < bb.upper);

  // Entry logic
  if (buyCondition) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  
  if (sellCondition) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
