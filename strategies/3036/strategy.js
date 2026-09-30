/*
 * @coinsori-strategy v1
 * name: BTC 1D Dual-MR + Squeeze Trend Leg (ATR-sized)
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated champion 3033 (ATR-sized Dual-MR) is defensively strong
 * but has a documented structural weakness: it misses melt-up upside (2017-21 it returned
 * ~0% while buy-and-hold made +829%). The ledger showed the hybrid MR+squeeze family
 * captured bull upside better. This is a principled extension: keep the validated defensive
 * MR core and ATR risk-scaled sizing, and ADD a squeeze-breakout trend leg that only fires
 * in a strong uptrend — so the strategy protects capital in bears AND rides melt-ups.
 * When it buys and sells: Defensive leg buys on Bollinger/Keltner flush with RSI oversold
 * inside a rising 200-day average, sells on snap-back above EMA20. Trend leg buys when
 * Bollinger width compresses (squeeze) then price closes above the 20-day high inside a
 * rising 200-day average, and rides with a wider exit (EMA20 or 20-day low). Both legs are
 * sized by the same ATR risk budget (2.5% of cash per trade) so volatility scales position.
 * When it does NOT work: If the 200-day trend gate whipsaws in a long sideways range it
 * stays flat (defensive, little upside). The trend leg can give back gains in a sharp
 * reversal right after a squeeze breakout. ATR-sizing trims position (and profit) in
 * high-volatility recoveries.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const bb = ctx.bb(20, 2.5, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const high20 = ctx.high(20, 1);
  const high20prev = ctx.high(20, 2);
  const close = ctx.closes;
  if (bb == null || rsi == null || sma200 == null || sma200prev == null || ema20 == null || atr == null || atr <= 0 || high20 == null || high20prev == null || close == null || close.length < 3) return null;

  const uptrend = sma200 > sma200prev;
  const lowerBand = bb.lower;
  const upperBand = bb.upper;
  const midBand = bb.mid;
  const keltnerLow = ema20 - 2.5 * atr;
  // Bollinger width compression = squeeze setup (narrow band relative to mid).
  const bbWidth = (upperBand - lowerBand) / midBand;
  const squeeze = bbWidth < 0.25; // tight bands, potential expansion

  // Track which leg we entered via a state flag (1=MR, 2=trend) so exits differ.
  const leg = ctx.state.leg || 0;

  if (pos > 0) {
    if (leg === 2) {
      // Trend leg: ride with a wider exit — close above EMA20 or break of 20-day low.
      const prevClose = close[close.length - 2];
      if (prevClose < ema20 || price < high20prev) {
        ctx.state.leg = 0;
        return { side: 'sell', qty: pos };
      }
      return null;
    }
    // MR leg: tight snap-back exit above EMA20 or RSI recovery.
    if (price > ema20 || rsi > 55) {
      ctx.state.leg = 0;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (!uptrend) return null;

  // ATR risk-scaled sizing shared by both legs.
  const riskBudget = 0.025 * ctx.cash;
  let qty = riskBudget / atr;
  const maxQty = (ctx.cash / price) * 0.95;
  qty = Math.min(qty, maxQty);
  if (qty <= 0) return null;

  // Trend leg: squeeze then close above 20-day high (use closed bars for the breakout).
  const prevClose = close[close.length - 2];
  if (squeeze && prevClose > high20prev) {
    ctx.state.leg = 2;
    return { side: 'buy', qty: qty };
  }

  // Defensive MR leg: Bollinger flush or Keltner pullback with RSI oversold.
  const bollingerFlush = price < lowerBand && rsi < 30;
  const keltnerPullback = price < keltnerLow && rsi < 40;
  if (bollingerFlush || keltnerPullback) {
    ctx.state.leg = 1;
    return { side: 'buy', qty: qty };
  }
  return null;
}
