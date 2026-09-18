/*
 * @coinsori-strategy v1
 * name: RSI Oversold Mean Reversion
 * ex: binance
 * syms: ETHUSDT
 * interval: 1h
 * cash: 10000
 *
 * Simple mean reversion: buy when RSI drops below 35 (oversold), sell when
 * RSI rises above 65 (overbought). No Bollinger Bands filter to keep
 * signal frequency reasonable.
 * When it underperforms: strong trends where RSI stays oversold for long
 * periods and never reverts.
 */

function onUpdate(ctx) {
  const rsi = ctx.rsi(14, 0);
  if (rsi == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  // Entry: RSI oversold — stretched enough to expect a bounce
  if (!pos && rsi < 35) {
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }

  // Exit: RSI overbought — mean has reverted
  if (pos && rsi > 65) {
    return { side: 'sell', qty: pos };
  }

  return null;
}
