/*
 * @coinsori-strategy v1
 * name: EMA Cross + RSI Filter + BB Confirmation
 * ex: binanceusdm
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Trend-following system that buys when a fast EMA crosses above a slow EMA,
 * but only when RSI confirms momentum AND price is near the lower Bollinger Band
 * (so we're not chasing). Shorts are the mirror. A funding-rate filter prevents
 * entering at market extremes. Positions exit on RSI reversal, MACD flip, or
 * Bollinger mean-reversion.
 * When it buys and sells: Long on EMA golden cross + RSI>50 + price at lower BB.
 * Short on EMA death cross + RSI<50 + price at upper BB. Exits on RSI extreme,
 * MACD reversal, or BB mean-reversion.
 * When it does NOT work: Choppy, low-volume markets where EMAs cross repeatedly
 * with no follow-through — every cross triggers and fees erode the account.
 */
function onUpdate(ctx) {
  // ── Indicators ──────────────────────────────────────────────────────────────
  const ema20  = ctx.ema(20);
  const ema50  = ctx.ema(50);
  const ema20_1 = ctx.ema(20, 1);
  const ema50_1 = ctx.ema(50, 1);
  const rsi    = ctx.rsi(14);
  const rsi_1  = ctx.rsi(14, 1);
  const bb     = ctx.bb(20, 2);
  const macd   = ctx.macd(12, 26, 9);
  const macd_1 = ctx.macd(12, 26, 9, 1);
  const funding = ctx.funding;

  // Guard all reads
  if (ema20 == null || ema50 == null || ema20_1 == null || ema50_1 == null) return null;
  if (rsi == null || rsi_1 == null) return null;
  if (bb == null || bb.mid == null) return null;
  if (macd == null || macd.macd == null || macd_1 == null || macd_1.macd == null) return null;

  const hasPos  = ctx.position > 0;
  const hasNeg  = ctx.position < 0;
  const neutral = ctx.position === 0;

  // ── Entry: EMA Golden Cross + RSI confirm + BB lower band ──────────────────
  // Golden cross: fast crossed above slow
  const goldenCross = ema20_1 <= ema50_1 && ema20 > ema50;
  // RSI in bullish territory (above 50 = bulls in control)
  const rsiBull = rsi > 50;
  // Price near lower BB (not already extended — buying the dip)
  const atLowerBB = ctx.price <= bb.mid;
  // Funding not deeply negative (not a funding bottom — avoid the knife)
  const fundOk = funding == null || funding > -0.0005;

  if (neutral && goldenCross && rsiBull && atLowerBB && fundOk) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // ── Entry: EMA Death Cross + RSI confirm + BB upper band ───────────────────
  const deathCross = ema20_1 >= ema50_1 && ema20 < ema50;
  const rsiBear = rsi < 50;
  const atUpperBB = ctx.price >= bb.mid;
  const fundOkShort = funding == null || funding < 0.0005;

  if (neutral && deathCross && rsiBear && atUpperBB && fundOkShort) {
    return { side: 'sell', qty: ctx.cash / ctx.price * 0.99 };
  }

  // ── Exit Long: RSI overbought, MACD reversal, or BB upper band touch ────────
  const rsiOB   = rsi >= 70;           // overbought — take profit
  const macdBear = macd_1.macd > macd_1.signal && macd.macd <= macd.signal; // flipped bearish
  const bbUpper  = ctx.price >= bb.mid + (bb.mid * 0.02); // 2% above mid = mean reversion

  if (hasPos && (rsiOB || macdBear || bbUpper)) {
    return { side: 'sell', qty: ctx.position };
  }

  // ── Exit Short: RSI oversold, MACD reversal, or BB lower band touch ────────
  const rsiOS    = rsi <= 30;
  const macdBull = macd_1.macd < macd_1.signal && macd.macd >= macd.signal; // flipped bullish
  const bbLower  = ctx.price <= bb.mid - (bb.mid * 0.02);

  if (hasNeg && (rsiOS || macdBull || bbLower)) {
    return { side: 'buy', qty: Math.abs(ctx.position) };
  }

  return null;
}
