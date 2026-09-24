/*
 * @coinsori-strategy v1
 * name: BTC Hysteresis Regime Trend 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated SMA50 regime-switch whipsaws in choppy
 * sideways markets because it exits the moment price closes a hair below the
 * 50-day average, then re-buys on the next tiny bounce. Adding a hysteresis
 * band — only exit when price is a full 1 ATR below the average — ignores small
 * oscillations while still riding the trend and cutting losers on real breaks.
 * When it buys and sells: Buy full when the last closed price is above the 50-day
 * average. Sell full when it closes more than 1 ATR below the average, or falls
 * more than 3 ATRs below it in one move (crash stop).
 * When it does NOT work: In a real slow downtrend that grinds below the average by
 * less than 1 ATR each day, the band delays the exit and gives back more profit;
 * and the crash stop is the only thing that saves a fast reversal.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 55) return null;
  // Use the last CLOSED bar (ago=1) — deterministic and identical everywhere.
  const px = closes[closes.length - 2];
  const sma50 = ctx.sma(50, 1);
  const atr = ctx.atr(14, 1);
  const pos = ctx.position;
  const cash = ctx.cash;
  if (px == null || sma50 == null || atr == null || px <= 0) return null;

  const long = px > sma50;
  // Hysteresis: only exit when price is a full ATR below the average, so small
  // oscillations around it don't whipsaw us out. 1.0 ATR chosen as a buffer
  // comparable to normal daily noise.
  const exitBelow = px < sma50 - 1.0 * atr;
  const crashStop = px < sma50 - 3.0 * atr;

  if (pos === 0) {
    if (long && cash > 0 && ctx.price > 0) {
      return { side: 'buy', qty: (cash / ctx.price) * 0.98 };
    }
    return null;
  }

  if (exitBelow || crashStop) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
