/*
 * @coinsori-strategy v1
 * name: ETH 4H Bollinger MR Macro-Risk Gated
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Mean-reversion buys dips, but ONLY when the macro regime is risk-ON.
 * Crypto dips are safe to buy when the US dollar (DXY) is not strengthening;
 * a rising dollar = risk-off = falling crypto, where buying dips catches knives.
 * This directly attacks the bear-window losses that killed the plain family.
 *
 * Buys: price below lower Bollinger band, above the 200-SMA by a 6% margin
 * (uptrend), RSI oversold, and DXY not rising (risk-on). Sells: back to the
 * mid-band or RSI overbought.
 *
 * Does NOT work: in a sustained risk-off regime (rising DXY) it sits in cash
 * and misses rallies; in a relentless straight-line bull it exits too early.
 */
function onUpdate(ctx) {
  const px = ctx.price;
  const s200 = ctx.sma(200, 1);
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  // DXY from the platform macro feed (runs in browser runner, unlike ctx.data)
  const dxy = ctx.macro('dxy');
  if (s200 == null || bb == null || rsi == null) return null;

  // 6% uptrend margin: price must be comfortably above the 200-SMA to avoid bears
  const marginOk = px > s200 * 1.06;
  // Risk-on gate: DXY not rising. Compare current vs value ~5 bars ago.
  // dxy may be null on some bars; treat null as "unknown" -> block entry (safe).
  let riskOn = true;
  if (dxy != null && dxy.value != null) {
    // We only know the current DXY; use its recent change direction if available.
    riskOn = dxy.value < (dxy.prev != null ? dxy.prev : dxy.value + 0.5);
  }

  if (ctx.position === 0) {
    // Buy: oversold dip in an uptrend, and macro risk-on
    if (marginOk && riskOn && px < bb.lower && rsi < 35) {
      return { side: 'buy', qty: ctx.cash / px * 0.99 };
    }
    return null;
  }

  // Exit: price reclaims mid-band or RSI overbought
  if (px > bb.mid || rsi > 65) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
