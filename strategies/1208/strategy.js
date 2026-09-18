/*
 * @coinsori-strategy v1
 * name: Dual Oscillator + ATR Volatility Filter
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Dual oscillator (RSI < 35 AND Stochastic %K < 25) for mean-reversion entries.
 * ATR volatility filter: only enter when daily ATR > 1.5% of price — avoids
 * low-volatility chop that causes false signals. Exits when RSI > 60 OR Stoch > 65.
 * 
 * Buys near oversold extremes and sells when overbought. Works best in ranging
 * and mild-trend markets. Fails in strong one-directional moves where oscillators
 * stay extended — the strategy will miss the bulk of the move and get stopped out.
 */

function onUpdate(ctx) {
  const rsi = ctx.rsi(14);
  const stoch = ctx.stoch(14, 3);
  const atr = ctx.atr(14);
  const price = ctx.price;

  if (rsi == null || stoch == null || atr == null) return null;

  // ATR filter: skip entries in low-volatility environments (chop is dangerous)
  const atrPct = (atr / price) * 100;
  if (atrPct < 1.5) return null;

  // Entry: dual oversold confirmation
  if (ctx.position === 0 && rsi < 35 && stoch.k < 25) {
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }

  // Exit: either oscillator reaches overbought
  if (ctx.position > 0 && (rsi > 60 || stoch.k > 65)) {
    return { side: 'sell', qty: ctx.position };
  }
}
