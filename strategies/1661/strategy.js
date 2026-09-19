/*
 * @coinsori-strategy v1
 * name: ATR Volatility Regime Switch
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 1000
 *
 * Why this strategy: Different market regimes require different strategies. High volatility favors momentum, low volatility favors mean reversion. ATR regime detection switches between them.
 * When it buys and sells: In high-vol regime, buy when price crosses above SMA50 with RSI > 50. In low-vol regime, buy when price touches the lower Bollinger Band. Sells when price crosses SMA50 the other way or RSI hits 70.
 * When it does NOT work: Whipsaws in choppy low-vol markets with no clear trend; sudden vol spikes catch the strategy in the wrong mode.
 */
function onUpdate(ctx) {
  const sma50 = ctx.sma(50);
  const sma200 = ctx.sma(200);
  const atr = ctx.atr(14);
  const atrSma = ctx.sma(14, 14); // ATR's own SMA to detect regime
  const rsi = ctx.rsi(14);
  const bb = ctx.bb(20, 2);
  const price = ctx.price;

  if (sma50 == null || sma200 == null || atr == null || atrSma == null || rsi == null || bb == null) return null;

  // Regime: high vol when ATR > its recent average
  const highVol = atr > atrSma;
  const trendUp = price > sma50 && sma50 > sma200; // confirmed uptrend
  const trendDown = price < sma50 && sma50 < sma200; // confirmed downtrend

  // === ENTRY LOGIC ===
  let entrySignal = false;

  if (highVol) {
    // Momentum mode: trade with trend, require confirmation
    if (!ctx.position && trendUp && rsi > 50) {
      entrySignal = true;
    }
  } else {
    // Mean-reversion mode: fade extremes, price at lower BB band
    if (!ctx.position && price <= bb.lower) {
      entrySignal = true;
    }
  }

  if (entrySignal) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // === EXIT LOGIC ===
  if (ctx.position > 0) {
    // Exit on trend reversal or overbought
    if (trendDown && price < sma50) {
      return { side: 'sell', qty: ctx.position };
    }
    if (rsi > 70) {
      return { side: 'sell', qty: ctx.position };
    }
    // Stop loss: 3× ATR from entry
    const stopPx = ctx.entryPx - 3 * atr;
    if (price < stopPx) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
