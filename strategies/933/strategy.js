/*
 * @coinsori-strategy v1
 * name: OI and Funding Rate Based Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses Open Interest (OI) and funding rate data to identify trends in the market. It aims to enter long positions when OI is increasing and funding rates are negative, indicating bullish sentiment. Conversely, it enters short positions when OI is decreasing and funding rates are positive, indicating bearish sentiment.
 * When it buys and sells: It buys when OI is rising and funding rate is negative, and sells when OI is falling and funding rate is positive.
 * When it does NOT work: This strategy may fail during periods of low volatility or when OI data is not reliable due to irregular trading patterns or lack of liquidity.
 */
function onUpdate(ctx) {
  // Read OI data from the external dataset (key: 'funding_rate')
  const oi = ctx.data('funding_rate');
  
  // Check if we have enough data to proceed
  if (oi == null || oi.length < 2) return null;
  
  // Get the latest and previous OI values
  const currentOi = oi[oi.length - 1];
  const previousOi = oi[oi.length - 2];
  
  // Read funding rate data from the external dataset (key: 'funding_rate')
  const funding = ctx.data('funding_rate');
  
  if (funding == null || funding.length < 2) return null;
  
  // Get the latest and previous funding rates
  const currentFunding = funding[funding.length - 1];
  const previousFunding = funding[funding.length - 2];
  
  // Check for conditions to enter a long position:
  // OI is increasing and funding rate is negative (indicating bullish sentiment)
  if (currentOi > previousOi && currentFunding < 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  
  // Check for conditions to enter a short position:
  // OI is decreasing and funding rate is positive (indicating bearish sentiment)
  if (currentOi < previousOi && currentFunding > 0) {
    return { side: 'sell', qty: ctx.position };
  }
  
  // No trade signal
  return null;
}
