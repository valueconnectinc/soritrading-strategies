/*
 * @coinsori-strategy v1
 * name: BB+RSI Mean Reversion — BTCUSDT 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Buys when price touches the lower Bollinger Band AND RSI < 40 (dual oversold
 * confirmation). Sells when price reaches the upper band OR RSI > 60.
 * Aims to capture mean-reversion bounces within a range-bound market.
 * When it fails: strong trending markets where price hugs the outer band
 * and never reverts — stops get hit repeatedly with no profitable bounce.
 */

function onUpdate(ctx) {
  const bb = ctx.bb(20, 2);
  const rsi = ctx.rsi(14);
  if (bb == null || rsi == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const lower = bb.lower;
  const upper = bb.upper;

  // Entry: price at lower band + RSI confirming oversold
  if (!pos && price <= lower && rsi < 40) {
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }

  // Exit: price at upper band OR RSI overbought
  if (pos && (price >= upper || rsi > 60)) {
    return { side: 'sell', qty: pos };
  }

  return null;
}
