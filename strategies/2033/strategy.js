/*
 * @coinsori-strategy v1
 * name: Fast EMA Momentum 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The slow EMA8/21 crossover (strategy 2030) was too
 * sluggish — it lagged badly in the bull window. This version uses a faster
 * EMA5/13 crossover to catch medium-term trends earlier. It also adds a
 * volume confirmation filter to avoid entries during thinning liquidity,
 * and uses a tighter 2% trailing stop to protect gains in volatile BTC.
 * When it buys and sells: Buy when EMA5 crosses above EMA13 AND volume
 * exceeds its 10-bar average. Sell when EMA5 crosses below EMA13 OR
 * 2% trailing stop triggers.
 * When it does NOT work: In very fast reversals the tight stop gets hit
 * before the cross signal fires. Also still suffers from the classic
 * EMA problem: too slow in chop, too late in trends.
 */

function onUpdate(ctx) {
  const s = ctx.state;

  // Detect new bar for stable crossover detection
  if (s.lastBarI !== ctx.i) {
    s.lastBarI = ctx.i;
    s.snapEma5  = ctx.ema(5);
    s.snapEma13 = ctx.ema(13);
    s.snapVol   = ctx.vol;
  }

  const ema5  = ctx.ema(5);
  const ema13 = ctx.ema(13);
  const vol   = ctx.vol;
  const avgVol = ctx.avgVol(10);

  if (ema5 == null || ema13 == null || vol == null || avgVol == null) return null;

  const prevEma5  = s.snapEma5  || ctx.ema(5,  1);
  const prevEma13 = s.snapEma13 || ctx.ema(13, 1);

  if (prevEma5 == null || prevEma13 == null) return null;

  const px  = ctx.price;
  const pos = ctx.position;

  // Volume confirmation filter
  const volConfirm = vol >= avgVol;

  // Crossover signals
  const bullCross = prevEma5 <= prevEma13 && ema5 > ema13;
  const bearCross = prevEma5 >= prevEma13 && ema5 < ema13;

  // ── Entry: Long ──────────────────────────────────────────────────────────────
  if (pos === 0) {
    if (bullCross && volConfirm) {
      const qty = ctx.cash / px * 0.99;
      return { side: 'buy', qty, type: 'limit', price: px, postOnly: true };
    }
    return null;
  }

  // ── Long exit ─────────────────────────────────────────────────────────────────
  if (pos > 0) {
    if (bearCross) {
      return { side: 'sell', qty: pos };
    }
    // 2% tight trailing stop
    const entryPx = ctx.entryPx;
    if (entryPx != null && px < entryPx * 0.98) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  return null;
}
