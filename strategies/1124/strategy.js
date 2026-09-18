/*
 * @coinsori-strategy v1
 * name: ETHUSDT 4H RSI Momentum
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Buy when 4H RSI crosses above 50 (bullish momentum confirmed).
 * Sell when RSI crosses below 50 (momentum shifting bearish).
 * Why: RSI(14) crossing 50 captures the transition from weak to strong
 * momentum, filtering out noise from oversold/overbought extremes.
 * When it buys and sells: Enter on RSI close above 50, exit on RSI close below 50.
 * Holding period: max 16 bars (~2.7 days) to avoid holding through trend changes.
 * When it does NOT work: In sharp one-day crashes (May 2021, Nov 2022),
 * RSI flips too fast and catches the knife. In slow grinding trends, the
 * 50-level exit is too early and leaves profit on the table.
 */

function onUpdate(ctx) {
  const rsi = ctx.rsi(14);
  const prevRsi = ctx.rsi(14, 1);
  if (rsi == null || prevRsi == null) return null;

  const price = ctx.price;
  const inPos = ctx.position > 0;

  // === ENTRY: RSI crosses above 50 (bullish momentum) ===
  if (!inPos && prevRsi <= 50 && rsi > 50) {
    ctx.state.entryBar = ctx.i;
    ctx.state.entryPx = price;
    return {
      side: 'buy',
      qty: ctx.cash / price * 0.99,
      type: 'limit',
      price: price
    };
  }

  // === EXIT: RSI crosses below 50 (bearish momentum) ===
  if (inPos && prevRsi >= 50 && rsi < 50) {
    ctx.state.entryBar = null;
    ctx.state.entryPx = null;
    return { side: 'sell', qty: ctx.position };
  }

  // === TIME EXIT: max 16 bars (~2.7 days) ===
  if (inPos) {
    if (ctx.state.entryBar == null) ctx.state.entryBar = ctx.i;
    if (ctx.i - ctx.state.entryBar >= 16) {
      ctx.state.entryBar = null;
      ctx.state.entryPx = null;
      return { side: 'sell', qty: ctx.position };
    }
  }

  // === STOP LOSS: 3x ATR from entry ===
  if (inPos && ctx.state.entryPx) {
    const atr = ctx.atr(14);
    if (atr != null) {
      const stopPx = ctx.state.entryPx - atr * 3;
      if (price < stopPx) {
        ctx.state.entryBar = null;
        ctx.state.entryPx = null;
        return { side: 'sell', qty: ctx.position };
      }
    }
  }

  return null;
}
