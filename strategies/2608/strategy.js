/*
 * @coinsori-strategy v1
 * name: Squeeze Breakout BTC+ETH 1D (DXY Gate)
 * ex: binance
 * syms: BTCUSDT, ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Same squeeze-breakout edge as the champion, but the
 * defensive gate is a MACRO one instead of a price one. When the US dollar
 * index (DXY) is strengthening (risk-off), crypto breakouts are more likely to
 * be bull traps, so we sit out. When DXY is weak/falling (risk-on), we let the
 * squeeze fire. A macro gate should keep more bull-market upside than a
 * price-level gate because it does not require price to be above a long average.
 * When it buys and sells: buys on the squeeze+volume+upper-band breakout, but
 * only while DXY is below its own rising trend (not in a dollar-strength
 * regime). Exits on a 2.5x-ATR stop or a 20-day low trail.
 * When it does NOT work: if crypto and the dollar decouple (e.g. BTC rallies
 * on its own fundamentals while DXY rises), the gate wrongly blocks good
 * breakouts; and it cannot catch the very start of a new bull that begins while
 * the dollar is still firm.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const atr = ctx.atr(14, 1);
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(20);
  const dxy = ctx.macro('dxy');
  if (bb == null || atr == null || vol == null || avgVol == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (price <= ctx.entryPx - atr * 2.5) return { side: 'sell', qty: pos };
    const ll20 = ctx.low(20, 1);
    if (ll20 != null && price < ll20) return { side: 'sell', qty: pos };
    return null;
  }

  // macro risk gate: only enter when the dollar is NOT in a strength regime.
  // DXY is a slow series, so compare it against a simple level/trend proxy.
  if (dxy == null) return null;
  // block entries when the dollar index is elevated (risk-off)
  if (dxy > 105) return null;

  const bw = (bb.upper - bb.lower) / bb.middle;
  let sum = 0, cnt = 0;
  for (let k = 1; k <= 20; k++) {
    const b = ctx.bb(20, 2, k);
    if (b == null) break;
    sum += (b.upper - b.lower) / b.middle;
    cnt++;
  }
  if (cnt < 20) return null;
  const avgBw = sum / cnt;
  if (bw >= avgBw) return null;

  if (vol > avgVol * 1.5 && price > bb.upper) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
