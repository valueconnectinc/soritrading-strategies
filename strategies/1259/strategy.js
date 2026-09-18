/*
 * @coinsori-strategy v1
 * name: BB Width Squeeze Expansion
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Bollinger Band Width squeeze then expansion breakout. When BB width contracts
 * to less than 3.5% of price (squeeze), the strategy waits for a confirmed candle
 * close outside the upper band and buys. Sells at 6% profit or price below lower band.
 * When it does NOT work: in slow grinding trends where BBs never squeeze and the
 * strategy sits out while buy-and-hold makes 20%+ — the squeeze signal is rare by design.
 */
function onUpdate(ctx) {
  var pos = ctx.position;
  var price = ctx.price;

  // Warm-up
  var bb20 = ctx.bb(20, 2, 1);
  var bbPrev = ctx.bb(20, 2, 2);
  if (bb20 == null || bbPrev == null) return null;

  // BB width = upper - lower
  var widthNow  = bb20.upper - bb20.lower;
  var widthPrev = bbPrev.upper - bbPrev.lower;

  // Squeeze: both bars narrow (< 3.5% of price)
  var squeezeNow  = widthNow  / price < 0.035;
  var squeezePrev = widthPrev / price < 0.035;
  var squeezeOn = squeezeNow && squeezePrev;

  // BUY: price closes above upper band after squeeze
  if (pos === 0 && squeezeOn) {
    if (price > bb20.upper) {
      ctx.log('BUY squeeze breakout upper=' + bb20.upper.toFixed(0) + ' price=' + price.toFixed(0));
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  // SELL
  if (pos > 0) {
    var entryPx = ctx.entryPx;
    var pnlPct  = (price - entryPx) / entryPx;
    var profit    = pnlPct >= 0.06;
    var reversal   = price < bb20.lower;
    var hardStop   = pnlPct <= -0.05;

    if (profit || reversal || hardStop) {
      ctx.log('SELL pnl=' + (pnlPct*100).toFixed(1) + '% lower=' + bb20.lower.toFixed(0));
      return { side: 'sell', qty: pos };
    }
  }

  return null;
}
