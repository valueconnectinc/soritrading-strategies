/*
 * @coinsori-strategy v1
 * name: Wide-Stop Melt-Up Trend Rider BTC 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The confirmed defensive champion lags pure melt-up windows
 * (2017-18 BTC, SOL/ETH melt-ups) because it exits bull positions too early and
 * prior bull-riders used tight ATR trailing stops that whipsawed out of strong
 * trends. This rider holds through the ENTIRE melt-up and exits only on a major
 * 50-EMA regime break, directly targeting that gap.
 * When it buys and sells: buys when the 20>50>200 EMA stack is bullish AND
 * fear-greed is high (trend confirmed + sentiment supportive). Holds with a wide
 * stop (exit only when price closes below the 50-EMA or a 6x ATR hard stop).
 * When it does NOT work: in choppy/sideways regimes the wide stop gives back
 * gains and the late entry buys near tops; it will lag in bear markets and
 * whipsaw in range-bound chop. This is a pure melt-up capture, not a defender.
 */
function onUpdate(ctx) {
  const ema20 = ctx.ema(20, 1);
  const ema50 = ctx.ema(50, 1);
  const ema200 = ctx.ema(200, 1);
  const atr = ctx.atr(14, 1);
  const fg = ctx.data('fg');
  if (ema20 == null || ema50 == null || ema200 == null || atr == null) return null;
  if (fg == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const stacked = ema20 > ema50 && ema50 > ema200; // full bullish stack = strong trend

  if (pos > 0) {
    // Wide exits: only leave a strong trend on a major regime break or a 6x ATR disaster stop.
    if (price < ema50) return { side: 'sell', qty: pos };
    if (price <= ctx.entryPx - atr * 6) return { side: 'sell', qty: pos };
    return null;
  }

  // Enter only in a confirmed strong trend with sentiment supportive.
  if (stacked && price > ema20 && fg > 55) {
    const qty = ctx.cash / price * 0.99;
    return { side: 'buy', qty: qty };
  }
  return null;
}
