/*
 * @coinsori-strategy v1
 * name: RSI Momentum + SMA Trend Filter
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Buys when RSI crosses above 30 (oversold bounce) while price is above SMA200
 * (confirmed uptrend). Exits when RSI crosses below 70 (overbought) or price
 * falls below SMA200. ATR filter ensures the move has real momentum behind it.
 * When it fails: choppy markets where RSI oscillates without clear direction;
 * strong downtrends where bounces are traps; low-liquidity periods on SOL.
 */

function onUpdate(ctx) {
  // Indicators
  const rsi    = ctx.rsi(14);
  const rsi1   = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200);
  const atr    = ctx.atr(14);
  const atr1   = ctx.atr(14, 1);

  // Guard: need 200 bars for SMA200
  if (rsi == null || rsi1 == null || sma200 == null || atr == null || atr1 == null) return null;

  const price = ctx.price;

  // ─── ENTRY ───────────────────────────────────────────────────────────────
  // RSI crosses from ≤30 to >30: oversold bounce
  // Price above SMA200: confirmed uptrend (no fading downtrends)
  // ATR rising: volatility is expanding, move has momentum
  const rsiCrossUp = rsi1 <= 30 && rsi > 30;
  const trendUp    = price > sma200;
  const atrRising  = atr > atr1;

  if (ctx.position === 0 && rsiCrossUp && trendUp && atrRising) {
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }

  // ─── EXIT ────────────────────────────────────────────────────────────────
  if (ctx.position > 0) {
    // RSI crosses below 70: overbought — take profit
    const rsiCrossDown = rsi1 >= 70 && rsi < 70;

    // Price falls below SMA200: trend reversal
    const trendBroken  = price < sma200;

    if (rsiCrossDown || trendBroken) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
