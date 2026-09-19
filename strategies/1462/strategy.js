/*
 * @coinsori-strategy v1
 * name: ATR Channel Breakout
 * ex: binanceusdm
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: ATR channels adapt to volatility — wider in turbulent markets,
 * tighter in calm ones. Unlike a fixed-EMA regime filter (which failed, exp 353/1461),
 * the ATR channel dynamically defines support/resistance and enters on momentum breaks.
 * When it buys and sells: Buys when price breaks above the upper ATR channel (EMA20 + ATR)
 * with RSI>50 confirming momentum. Sells when RSI falls below 40 or price drops below
 * the lower channel band (EMA20 - 0.5×ATR).
 * When it does NOT work: Choppy markets where price pierces the channel but immediately
 * reverses — ATR channels widen and give false breakouts in ranging conditions.
 */

function onUpdate(ctx) {
  // Warm-up guard
  const ema20_1 = ctx.ema(20, 1);
  const atr14_1 = ctx.atr(14, 1);
  const rsi14_1 = ctx.rsi(14, 1);
  if (ema20_1 == null || atr14_1 == null || rsi14_1 == null) return null;

  const price   = ctx.price;
  const ema20   = ema20_1;
  const atr     = atr14_1;
  const rsi     = rsi14_1;

  // ATR channel bands
  const upperBand = ema20 + atr;      // upper resistance
  const lowerBand = ema20 - 0.5 * atr; // lower support band

  // === ENTRY ===
  if (ctx.position === 0) {
    // Price breaks above upper ATR band + RSI confirms momentum
    const priceBreakout = price > upperBand;
    const rsiConfirm    = rsi > 50;

    if (priceBreakout && rsiConfirm) {
      return { side: 'buy', qty: ctx.cash / price * 0.99, type: 'smart' };
    }
    return null;
  }

  // === EXIT ===
  if (ctx.position > 0) {
    // Exit 1: RSI overbought → trend exhaustion
    const rsiExit = rsi > 70;

    // Exit 2: Price falls below lower ATR band → channel support broken
    const bandExit = price < lowerBand;

    // Exit 3: ATR stop — 2× ATR from entry
    const atrStopPx = ctx.entryPx - 2.0 * atr;
    const hitStop   = price < atrStopPx;

    // Exit 4: ATR target — 3× ATR from entry
    const atrTargPx = ctx.entryPx + 3.0 * atr;
    const hitTarg   = price > atrTargPx;

    if (rsiExit || bandExit || hitStop || hitTarg) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
