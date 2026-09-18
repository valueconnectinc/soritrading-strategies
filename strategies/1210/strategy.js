/*
 * @coinsori-strategy v1
 * name: Bollinger Bands + RSI Mean Reversion v2
 * ex: binance
 * syms: ETHUSDT
 * interval: 1h
 * cash: 10000
 *
 * Mean reversion on ETH: buy when RSI drops below 35 while price is at or
 * below the lower Bollinger Band. Sell when RSI rises above 65 or price
 * reaches the upper band.
 * When it underperforms: strong trending markets where RSI stays extended
 * and price rides the band without reverting.
 */

function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 0);
  const rsi = ctx.rsi(14, 0);
  if (bb == null || rsi == null) return null;

  const { upper, middle, lower } = bb;
  const price = ctx.price;
  const pos = ctx.position;

  // Entry: RSI oversold and price at or below lower BB — stretched enough to mean-revert
  if (!pos && rsi < 35 && price <= lower) {
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }

  // Exit: RSI overbought OR price at/above upper BB
  if (pos) {
    if (rsi > 65 || price >= upper) {
      return { side: 'sell', qty: pos };
    }
  }

  return null;
}
