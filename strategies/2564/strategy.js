/*
 * @coinsori-strategy v1
 * name: Pure-Price Melt-Up Trend Rider BTC 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The confirmed defensive champion lags pure melt-up
 * windows because it exits bull positions too early (at the 50-EMA break).
 * Prior melt-up riders used a fear-greed gate that was proven stale/broken in
 * recent data. This version uses ONLY pure price signals: ride the full
 * 20>50>200 EMA-stack uptrend with a wide 6x-ATR stop and exit only on a real
 * 50-EMA regime break — directly targeting the melt-up gap with no broken
 * sentiment gate.
 * When it buys and sells: buys when the 20>50>200 EMA stack is bullish and
 * price is above the 20-EMA. Holds with a wide stop (exit only when price
 * closes below the 50-EMA or a 6x-ATR disaster stop).
 * When it does NOT work: in choppy/sideways regimes the wide stop gives back
 * gains and the late entry buys near tops; it will lag and whipsaw in bear
 * markets and range-bound chop. This is a pure melt-up capture, not a
 * defender — expect high drawdown in corrections.
 */
function onUpdate(ctx) {
  const ema20 = ctx.ema(20, 1);
  const ema50 = ctx.ema(50, 1);
  const ema200 = ctx.ema(200, 1);
  const atr = ctx.atr(14, 1);
  if (ema20 == null || ema50 == null || ema200 == null || atr == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const stacked = ema20 > ema50 && ema50 > ema200; // full bullish stack = strong trend

  if (pos > 0) {
    // Wide exits: only leave a strong trend on a major 50-EMA regime break or 6x-ATR disaster stop.
    if (price < ema50) return { side: 'sell', qty: pos };
    if (price <= ctx.entryPx - atr * 6) return { side: 'sell', qty: pos };
    return null;
  }

  // Enter only in a confirmed strong trend, price above the 20-EMA.
  if (stacked && price > ema20) {
    const qty = ctx.cash / price * 0.99;
    return { side: 'buy', qty: qty };
  }
  return null;
}
