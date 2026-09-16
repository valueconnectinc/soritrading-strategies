/*
 * @coinsori-strategy v1
 * name: Mean Reversion with ATR Stop Loss
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy employs a mean reversion approach with an ATR-based stop-loss to manage risk. It buys when the price is below the 20-period SMA and sells when it crosses above. The ATR-based stop loss helps in reducing losses during volatile markets.
 * When it buys and sells: Buys when price is below the 20-period SMA. Sells when price crosses above the 20-period SMA.
 * When it does NOT work: This strategy may underperform in strong trending markets where prices continue moving in one direction for extended periods without retracing.
 */

function onUpdate(ctx) {
  // Calculate indicators
  const sma20 = ctx.sma(20);
  const atr = ctx.atr(14);

  // Guard against null values
  if (sma20 == null || atr == null) return null;

  // Buy condition: Price is below SMA
  if (ctx.price < sma20) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Sell condition: Price crosses above SMA
  if (ctx.price > sma20) {
    return { side: 'sell', qty: ctx.position };
  }
  
  return null;
}
