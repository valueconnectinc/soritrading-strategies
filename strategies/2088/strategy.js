/*
 * @coinsori-strategy v1
 * name: ATR Ratio Regime + BB Stochastic SOLUSDT 4H
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The proven ATR14/ATR50 ratio cleanly separates trending from choppy
 * markets (exp 507: beat benchmark in all 3 windows on AVAXUSDT 4H with 5-7 trades).
 * This applies the same regime-adaptive logic to SOLUSDT, testing whether the concept
 * transfers to another volatile altcoin.
 * When it buys and sells: In trending regime (ATR ratio > 0.85) — buy on BB lower-band
 * touches with stochastic < 20, sell on BB upper-band touches with stochastic > 80.
 * In choppy regime (ATR ratio < 0.6) — skip entries entirely (too many false signals).
 * When it does NOT work: Bull markets — the strategy is biased toward mean-reversion
 * and will underperform in strong trending uptrends. Also fails in low-volume environments
 * where BB bands compress and signals become unreliable.
 */

function onUpdate(ctx) {
  // --- Regime detection: ATR ratio ---
  const atr14 = ctx.atr(14);
  const atr50 = ctx.atr(50);
  if (atr14 == null || atr50 == null) return null;

  // ATR ratio: high = trending (wide swings), low = choppy (compressed ranges)
  const atrRatio = atr14 / atr50;
  const TREND_THRESH = 0.85;   // above this → trending regime
  const CHOP_THRESH  = 0.60;   // below this → choppy regime (skip entries)
  const isTrending = atrRatio > TREND_THRESH;
  const isChoppy   = atrRatio < CHOP_THRESH;

  // --- Trend direction (trend mode only) ---
  const ema20 = ctx.ema(20);
  const ema50 = ctx.ema(50);
  if (ema20 == null || ema50 == null) return null;
  const isUptrend = ema20 > ema50;

  // --- Bollinger Bands ---
  const bb = ctx.bb(20, 2);
  if (bb == null) return null;
  const lower = bb.lower;
  const upper = bb.upper;

  // --- Stochastic ---
  const stoch  = ctx.stoch(14, 3);
  const stoch1 = ctx.stoch(14, 3, 1);
  const stoch2 = ctx.stoch(14, 3, 2);
  if (stoch == null || stoch1 == null || stoch2 == null) return null;

  const k  = stoch.k;
  const d  = stoch.d;
  const k1 = stoch1.k;
  const d1 = stoch1.d;
  const k2 = stoch2.k;

  // Current bar price
  const price = ctx.price;
  const position = ctx.position;

  // Stochastic bullish crossover: K crosses above D while both are low
  const stochBullX = (k2 <= d1 && k1 > d1) && (k < 35 && d < 35);
  // Stochastic bearish crossover: K crosses below D while both are high
  const stochBearX = (k2 >= d1 && k1 < d1) && (k > 65 && d > 65);

  // --- Bar-state tracker (bars held) using ctx.state ---
  if (ctx.state.lastBarI !== ctx.i) {
    ctx.state.prevBarsHeld = ctx.state.barsHeld || 0;
    ctx.state.lastBarI = ctx.i;
  }
  const prevBarsHeld = ctx.state.prevBarsHeld || 0;
  const barsHeld = position > 0 ? prevBarsHeld + 1 : 0;
  ctx.state.barsHeld = barsHeld;

  // --- Entry: BB lower-band touch + stochastic confirms oversold ---
  // Only in trending regime (chop regime skipped entirely)
  const bbLowerTouch = price <= lower * 1.002;
  const stochOversold = k < 25 && d < 30;

  if (!isChoppy && position === 0 && bbLowerTouch && (stochBullX || stochOversold)) {
    if (!isTrending || isUptrend) {
      const qty = ctx.cash / price * 0.95;
      return { side: 'buy', qty, type: 'market' };
    }
  }

  // --- Exit: BB upper-band touch + stochastic confirms overbought ---
  const bbUpperTouch = price >= upper * 0.998;
  const stochOverbought = k > 75 && d > 70;

  if (position > 0 && bbUpperTouch && (stochBearX || stochOverbought)) {
    return { side: 'sell', qty: position, type: 'market' };
  }

  // --- ATR-based stop loss ---
  const atr = ctx.atr(14);
  if (position > 0 && atr != null) {
    const stopBuffer = isChoppy ? 1.5 : 2.5;   // tighter stop in chop
    const stopPx = ctx.entryPx - stopBuffer * atr;
    if (price < stopPx) {
      return { side: 'sell', qty: position, type: 'market', cancel: true };
    }
  }

  // --- Time-based exit: if in choppy regime and holding > 8 bars, exit ---
  if (position > 0 && isChoppy && barsHeld > 8) {
    return { side: 'sell', qty: position, type: 'market' };
  }

  return null;
}
