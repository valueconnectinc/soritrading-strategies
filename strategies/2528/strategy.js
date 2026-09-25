/*
 * @coinsori-strategy v1
 * name: Extreme-Greed Fade Short (Sentiment Mirror)
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The validated fear-contrarian edge is that crowd extremes
 * revert. The long champion buys panic (fear<40 + lower-BB break). This is the
 * MIRROR: when the crowd is in EXTREME GREED (fear-greed > 80) and price breaks
 * above the upper Bollinger band, it SHORTS the overbought and exits back at the
 * mid band — testing whether the crowd-behaviour edge is symmetric.
 * When it buys/sells: opens a SHORT when fear-greed > 80 AND price closes above
 * the upper Bollinger band; covers when price falls back to the mid band or a
 * hard stop trips.
 * When it does NOT work: in a strong melt-up (2020-21) greed stays extreme and
 * price keeps ripping — the short gets stopped out repeatedly. This is a
 * mean-reversion bet that bleeds in one-way bull markets.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const fg = ctx.data('fg');
  if (bb == null || bb.upper == null || bb.mid == null) return null;
  if (fg == null) return null;

  const price = ctx.price;
  const pos = ctx.position; // negative = short
  const atr = ctx.atr(14, 1);

  if (pos < 0) {
    // hard stop: 2.5x ATR above entry (short means price rising is bad)
    if (atr != null && price >= ctx.entryPx + atr * 2.5) return { side: 'buy', qty: -pos };
    // cover at mid band (mean reversion target)
    if (price <= bb.mid) return { side: 'buy', qty: -pos };
    return null;
  }

  // open short only in extreme greed above the upper band
  if (fg > 80 && price > bb.upper) {
    return { side: 'sell', qty: ctx.cash / ctx.price * 0.99 * 2 }; // 2x notional
  }

  return null;
}
