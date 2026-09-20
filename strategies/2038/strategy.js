/*
 * @coinsori-strategy v1
 * name: EMA Crossover + Wide RSI Filter
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: BTC 4H trends in bursts — EMA crossover catches the start of each burst.
 * Wide RSI filter (30-85) avoids extremes while allowing entries during strong momentum.
 * When it buys and sells: Buy on EMA 9/20 bullish crossover when RSI is between 30-85.
 * Sell on EMA 9/20 bearish crossover or if RSI drops below 30 (oversold exit).
 * When it does NOT work: In sharp one-bar reversals with no follow-through, EMA crossovers
 * still fire and produce whipsaws. In ultra-slow grinding trends, many small crosses occur.
 */

function onUpdate(ctx) {
  const ema9_1 = ctx.ema(9, 1), ema9_2 = ctx.ema(9, 2);
  const ema20_1 = ctx.ema(20, 1), ema20_2 = ctx.ema(20, 2);
  const rsi = ctx.rsi(14, 1);
  const price = ctx.price;

  if (ema9_1 == null || ema9_2 == null || ema20_1 == null || ema20_2 == null || rsi == null) return null;

  // === ENTRY: EMA bullish crossover, RSI in wide 30-85 range ===
  // Relaxed from 40-70 to allow entries during strong momentum (RSI 70-85)
  // and oversold bounces (RSI 30-40)
  const prevBelow = ema9_2 <= ema20_2;
  const currAbove = ema9_1 > ema20_1;
  const rsiOk = rsi >= 30 && rsi <= 85;

  if (prevBelow && currAbove && rsiOk && ctx.position === 0) {
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }

  // === EXIT: EMA bearish crossover OR RSI oversold (< 30) ===
  const prevAbove = ema9_2 >= ema20_2;
  const currBelow = ema9_1 < ema20_1;
  const rsiOversold = rsi < 30;

  if ((prevAbove && currBelow || rsiOversold) && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
