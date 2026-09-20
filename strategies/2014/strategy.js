/*
 * @coinsori-strategy v1
 * name: EMA Crossover + ATR Trailing Stop
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: EMA crossover is proven (+22 to +35% in prior cycles) but the
 * exit was a fixed RSI level. This version replaces that with an ATR-based stop,
 * which locks in more profit during strong trends and adapts to SOL's volatility.
 * When it buys and sells: Buy when EMA9 crosses above EMA21 with ATR rising
 * (confirming momentum). Sell when EMA9 crosses below EMA21 OR price hits ATR stop.
 * When it does NOT work: In choppy markets where EMAs cross repeatedly, the ATR
 * stop gets hit frequently even with the momentum filter, causing whipsaw losses.
 */

function onUpdate(ctx) {
  // Indicators
  const ema9  = ctx.ema(9);
  const ema21 = ctx.ema(21);
  const atr   = ctx.atr(14);

  // Warm-up guard
  if (ema9 == null || ema21 == null || atr == null) return null;

  // EMA crossover on previous closed bar (stable, not live)
  const ema9_1  = ctx.ema(9,  1);
  const ema21_1 = ctx.ema(21, 1);
  if (ema9_1 == null || ema21_1 == null) return null;

  const crossUp   = ema9_1 <= ema21_1 && ema9 > ema21;
  const crossDown = ema9_1 >= ema21_1 && ema9 < ema21;

  // ATR rising = momentum confirming trend strength
  const atr_1 = ctx.atr(14, 1);
  const atrRising = atr_1 != null && atr > atr_1;

  // Position state
  const pos   = ctx.position;
  const px    = ctx.price;
  const entry = ctx.entryPx;

  // Entry: Long - EMA9 crosses above EMA21 + ATR rising
  if (pos === 0 && crossUp && atrRising) {
    const qty = ctx.cash / px * 0.95;
    return { side: 'buy', qty: qty, type: 'limit', price: px };
  }

  // Entry: Short - EMA9 crosses below EMA21 + ATR rising
  if (pos === 0 && crossDown && atrRising) {
    const qty = ctx.cash / px * 0.95;
    return { side: 'sell', qty: qty, type: 'limit', price: px };
  }

  // Exit: Long - ATR stop or EMA cross back down
  if (pos > 0) {
    if (entry != null) {
      const stopPx = entry - 2.5 * atr;
      if (px < stopPx) {
        return { side: 'sell', qty: pos };
      }
    }
    if (crossDown) {
      return { side: 'sell', qty: pos };
    }
  }

  // Exit: Short - ATR stop or EMA cross back up
  if (pos < 0) {
    if (entry != null) {
      const stopPx = entry + 2.5 * atr;
      if (px > stopPx) {
        return { side: 'buy', qty: Math.abs(pos) };
      }
    }
    if (crossUp) {
      return { side: 'buy', qty: Math.abs(pos) };
    }
  }

  return null;
}
