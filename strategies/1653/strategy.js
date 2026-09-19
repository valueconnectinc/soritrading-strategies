/*
 * @coinsori-strategy v1
 * name: BB+ATR Mean Reversion (AVAXUSDT)
 * ex: binance
 * syms: AVAXUSDT
 * interval: 4h
 * cash: 10000
 *
 * Buys when price touches the lower Bollinger Band (mean reversion).
 * ATR filter avoids entries in choppy, low-momentum markets.
 * ATR trailing stop locks in profits. No shorting (avoids fading uptrends).
 * When it fails: strong trending markets where price stays at lower band;
 * low-liquidity periods; assets too volatile for BB bands.
 */

function onUpdate(ctx) {
  const bb   = ctx.bb(20, 2);
  const atr  = ctx.atr(14);
  const atr1 = ctx.atr(14, 1);

  if (bb == null || atr == null || atr1 == null) return null;

  const price    = ctx.price;
  const lower    = bb.lower;
  const mid      = bb.mid;
  const position = ctx.position;

  // ─── ENTRY ───────────────────────────────────────────────────────────────
  // Price touches lower BB: mean-reversion bounce setup
  // ATR rising: market has momentum, not a dead-cat bounce
  // Not in a position: no pyramiding
  const atLowerBand = price <= lower;
  const atrRising   = atr > atr1;

  if (position === 0 && atLowerBand && atrRising) {
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }

  // ─── ATR TRAILING STOP ───────────────────────────────────────────────────
  if (position > 0) {
    if (entryPrice === null) entryPrice = ctx.entryPx;

    const trailStop = entryPrice - 2 * atr;

    if (price <= trailStop) {
      entryPrice = null;
      return { side: 'sell', qty: position };
    }

    if (price >= mid) {
      entryPrice = null;
      return { side: 'sell', qty: position };
    }
  }

  return null;
}

var entryPrice = null;
