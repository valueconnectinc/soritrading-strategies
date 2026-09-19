/*
 * @coinsori-strategy v1
 * name: Bollinger Band + RSI Mean Reversion v3
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: SOLUSDT oscillates between mean-reversion phases (price overshoots
 * then snaps back to value) and trending phases. This strategy catches the overshoot
 * reversals using Bollinger Bands, confirmed by RSI exhaustion and a faster trend filter.
 * When it buys and sells: Buy when price touches the lower Bollinger Band with RSI below 30
 * and a short-term uptrend is in place (fast EMA cross bullish). Sell when price reaches
 * the middle band or RSI hits 70. When it does NOT work: Fails in sustained one-directional
 * trends where RSI stays overbought/oversold for extended periods and price never mean-reverts.
 */

function onUpdate(ctx) {
  const sma20 = ctx.sma(20);
  if (sma20 == null) return null;

  // Core indicators
  const bb = ctx.bb(20, 2);
  if (bb == null || bb.lower == null || bb.mid == null) return null;

  const rsi = ctx.rsi(14);
  if (rsi == null) return null;

  // Fast trend filter: EMA(9) above EMA(20) = short-term uptrend
  // Using ago=1 (previous closed bar) for stability
  const ema9  = ctx.ema(9, 1);
  const ema20 = ctx.ema(20, 1);
  if (ema9 == null || ema20 == null) return null;
  const trendUp = ema9 > ema20;

  // Volume confirmation: today's volume above 1.3× 20-bar average
  const avgVol = ctx.avgVol(20);
  const volConfirm = (avgVol != null && avgVol > 0 && ctx.vol > avgVol * 1.3);

  // Entry: price at/below lower BB, RSI oversold, short-term uptrend, volume confirm
  const atLower = ctx.price <= bb.lower;
  const rsiOversold = rsi < 30;

  if (ctx.position === 0 && atLower && rsiOversold && trendUp && volConfirm) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Exit: price at/below middle band AND RSI not overbought
  if (ctx.position > 0) {
    const profitPct = (ctx.price - ctx.entryPx) / ctx.entryPx * 100;

    // Take profit at middle band OR RSI overbought
    if (ctx.price >= bb.mid || rsi > 70 || profitPct > 8) {
      return { side: 'sell', qty: ctx.position };
    }

    // Stop loss: price 3% below entry
    if (profitPct < -3) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
