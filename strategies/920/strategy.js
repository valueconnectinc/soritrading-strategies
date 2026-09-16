/*
 * @coinsori-strategy v1
 * name: SMA RSI Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * This strategy attempts to profit from mean-reverting behavior of BTCUSDT price
 * by using simple moving average and RSI indicators. It buys when price drops below
 * the SMA and RSI < 30, and sells when price goes above SMA and RSI > 70.
 * Why this strategy: The idea is that in most market conditions, prices tend to revert
 * to their mean — this approach tries to capture those reversion opportunities.
 * When it buys and sells: Buys after sustained price drop below SMA with oversold RSI,
 * and sells when price surges above SMA with overbought RSI.
 * When it does NOT work: In strong trends, especially during explosive run-up or crash-downs,
 * this strategy will likely incur losses due to frequent whipsaws.
 */

function onUpdate(ctx) {
  // Calculate indicators
  const sma = ctx.sma(20);
  const rsi = ctx.rsi(14);
  const price = ctx.price;

  // Guard against null values (warm-up period)
  if (sma == null || rsi == null) return null;

  // Buy condition: Price below SMA and RSI < 30 (oversold)
  if (price < sma && rsi < 30) {
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }

  // Sell condition: Price above SMA and RSI > 70 (overbought)
  if (price > sma && rsi > 70) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
