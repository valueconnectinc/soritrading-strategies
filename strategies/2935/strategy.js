/*
 * @coinsori-strategy v1
 * name: ETH 4H Bollinger MR Full-Cash (no macro gate)
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Control experiment: same mean-reversion as 2934 but WITHOUT the DXY macro
 * gate, to isolate whether the gate adds value or the improvement comes from
 * full-cash sizing. Pure price/RSI, runs in the browser runner reliably.
 *
 * Buys: price below lower Bollinger band, above 200-SMA by 6% margin, RSI<35.
 * Sells: back to mid-band or RSI>65.
 *
 * Does NOT work: in bears below the 200-SMA it stays in cash; in straight-line
 * bulls it exits too early.
 */
function onUpdate(ctx) {
  const px = ctx.price;
  const s200 = ctx.sma(200, 1);
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  if (s200 == null || bb == null || rsi == null) return null;

  const marginOk = px > s200 * 1.06;

  if (ctx.position === 0) {
    if (marginOk && px < bb.lower && rsi < 35) {
      return { side: 'buy', qty: ctx.cash / px * 0.99 };
    }
    return null;
  }

  if (px > bb.mid || rsi > 65) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
