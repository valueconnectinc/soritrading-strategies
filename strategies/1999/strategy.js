/*
 * @coinsori-strategy v1
 * name: Stochastic Trend Momentum with ATR Trail
 * ex: binance
 * syms: LINKUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Inverted stochastic — using it as trend-following confirmation
 * (K>D above 30 = uptrend) rather than mean-reversion (oversold = buy). Combined with
 * EMA20 trend filter and ATR trailing stop. Different signal family from RSI/BB mean
 * reversion (AVAX) and stochastic mean reversion (BNB). LINKUSDT adds asset diversity.
 * When it buys and sells: Buy when stochastic %K crosses above %D above the 30-line
 * (confirming uptrend), price above EMA20, and volume confirms. ATR-based stop loss
 * with take-profit tightening. Sell on reverse crossover or stop hit.
 * When it does NOT work: In choppy markets where stochastic oscillates around 30/70,
 * this generates whipsaws. The EMA filter helps but cannot eliminate all false
 * breakouts in range-bound conditions.
 */

function onUpdate(ctx) {
  // ── Indicators ──────────────────────────────────────────────────────────────
  const stoch   = ctx.stoch(14, 3);   // stochastic %K, %D (n=14, d=3)
  const bb      = ctx.bb(20, 2);
  const atr     = ctx.atr(14);
  const ema20   = ctx.ema(20);
  const avgVol  = ctx.avgVol(20);
  const funding = ctx.funding;

  // Warm-up
  if (stoch == null || bb == null || atr == null || ema20 == null || avgVol == null) return null;

  const pos     = ctx.position;
  const px      = ctx.price;
  const vol     = ctx.vol;

  // ── Funding soft bias (skip if extreme opposite direction) ──────────────────
  const skipLong  = funding != null && funding > 0.005;
  const skipShort = funding != null && funding < -0.005;

  // ── Volume confirmation: relaxed to 0.5× avg to avoid missing valid trends ─
  const volConfirm = avgVol > 0 && vol >= avgVol * 0.5;

  // ── Stochastic state ─────────────────────────────────────────────────────────
  const stochPrev = ctx.stoch(14, 3, 1);
  const stochK    = stoch.k;
  const stochD    = stoch.d;
  const stochPrevK = stochPrev != null ? stochPrev.k : null;
  const stochPrevD = stochPrev != null ? stochPrev.d : null;

  // ── Entry: Long ──────────────────────────────────────────────────────────────
  // Stochastic bullish crossover with momentum confirmation (K>D above 30)
  if (pos === 0) {
    const crossUp   = stochPrevK != null && stochPrevK <= stochPrevD && stochK > stochD;
    const hasMomentum = stochK > 30 && stochD > 30;
    const priceAboveEma = px > ema20;

    if (crossUp && hasMomentum && priceAboveEma && !skipLong) {
      if (volConfirm) {
        const qty = ctx.cash / px * 0.95;
        return { side: 'buy', qty, type: 'limit', price: px };
      }
    }
  }

  // ── Entry: Short ─────────────────────────────────────────────────────────────
  if (pos === 0) {
    const crossDown  = stochPrevK != null && stochPrevK >= stochPrevD && stochK < stochD;
    const hasBearMom = stochK < 70 && stochD < 70;
    const priceBelowEma = px < ema20;

    if (crossDown && hasBearMom && priceBelowEma && !skipShort) {
      if (volConfirm) {
        const qty = ctx.cash / px * 0.95;
        return { side: 'sell', qty, type: 'limit', price: px };
      }
    }
  }

  // ── Exit: Long ────────────────────────────────────────────────────────────────
  if (pos > 0) {
    // Reverse crossover exits
    const revCross = stochPrevK != null && stochPrevK >= stochPrevD && stochK < stochD;
    if (revCross) {
      return { side: 'sell', qty: pos };
    }

    // ATR stop loss: 2.5× ATR below entry
    const entryPx = ctx.entryPx;
    if (entryPx != null) {
      const slPx = entryPx - 2.5 * atr;
      if (px < slPx) {
        return { side: 'sell', qty: pos };
      }
      // Take profit: if 3× ATR in profit, tighten stop to 1.5× ATR below current price
      const profitTarget = entryPx + 3.0 * atr;
      if (px > profitTarget) {
        const tightSl = px - 1.5 * atr;
        if (px < tightSl) {
          return { side: 'sell', qty: pos };
        }
      }
    }
  }

  // ── Exit: Short ──────────────────────────────────────────────────────────────
  if (pos < 0) {
    const revCrossUp = stochPrevK != null && stochPrevK <= stochPrevD && stochK > stochD;
    if (revCrossUp) {
      return { side: 'buy', qty: Math.abs(pos) };
    }

    const entryPx = ctx.entryPx;
    if (entryPx != null) {
      const slPx = entryPx + 2.5 * atr;
      if (px > slPx) {
        return { side: 'buy', qty: Math.abs(pos) };
      }
      // Take profit: if 3× ATR in profit, tighten stop
      const profitTarget = entryPx - 3.0 * atr;
      if (px < profitTarget) {
        const tightSl = px + 1.5 * atr;
        if (px > tightSl) {
          return { side: 'buy', qty: Math.abs(pos) };
        }
      }
    }
  }

  return null;
}
