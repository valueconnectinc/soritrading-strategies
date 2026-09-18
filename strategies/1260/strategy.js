/*
 * @coinsori-strategy v1
 * name: BB Squeeze + EMA200 Trend Filter
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Bollinger Band Width squeeze (both bars < 3.5% of price) combined with
 * EMA200 trend confirmation. Only buys when: squeeze is on AND price is above
 * EMA200 (confirmed uptrend). Sells at 6% profit or price below lower band.
 * When it does NOT work: in strong trending markets that never squeeze — the
 * signal is rare by design, so the strategy may miss big moves entirely.
 */
function onUpdate(ctx) {
  var pos   = ctx.position;
  var price = ctx.price;

  // Warm-up
  var bb20   = ctx.bb(20, 2, 1);
  var bbPrev = ctx.bb(20, 2, 2);
  var ema200 = ctx.ema(200, 1);
  if (bb20 == null || bbPrev == null || ema200 == null) return null;

  // BB width squeeze check
  var widthNow  = bb20.upper  - bb20.lower;
  var widthPrev = bbPrev.upper - bbPrev.lower;
  var squeezeNow  = widthNow  / price < 0.035;
  var squeezePrev = widthPrev / price < 0.035;
  var squeezeOn = squeezeNow && squeezePrev;

  // Trend: price above EMA200 = confirmed uptrend
  var bullTrend = price > ema200;

  // BUY: squeeze + breakout above upper band + bull trend
  if (pos === 0 && squeezeOn && bullTrend) {
    if (price > bb20.upper) {
      ctx.log('BUY squeeze+trend upper=' + bb20.upper.toFixed(0) + ' EMA200=' + ema200.toFixed(0));
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  // SELL
  if (pos > 0) {
    var entryPx = ctx.entryPx;
    var pnlPct  = (price - entryPx) / entryPx;
    var profit    = pnlPct >= 0.06;
    var reversal  = price < bb20.lower;
    var hardStop  = pnlPct <= -0.05;

    if (profit || reversal || hardStop) {
      ctx.log('SELL pnl=' + (pnlPct*100).toFixed(1));
      return { side: 'sell', qty: pos };
    }
  }

  return null;
}
