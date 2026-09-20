/*
 * @coinsori-strategy v1
 * name: DOGE Dual-Oscillator Mean Reversion 4H
 * ex: binance
 * syms: DOGEUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The BB+RSI dip-buy on DOGE defends crashes well but takes
 * some weak signals. On ETH, AVAX and BNB, adding a second oscillator (Stochastic
 * oversold) as confirmation cut trade count and improved alpha — dual confirmation
 * filters out shallow dips that would reverse. This applies the same proven recipe
 * to DOGE, keeping the fixed crash gate and ATR stop from the validated version.
 * When it buys and sells: buy when price touches the lower Bollinger band AND RSI
 * is oversold AND Stochastic is oversold AND price is still near the long mean (a
 * dip, not a collapse). Sell at the middle band or overbought; stop on an
 * ATR-scaled drop below entry.
 * When it does NOT work: in a strong sustained bull the lower band is rarely
 * touched so it sits in cash and misses the melt-up; dual confirmation also skips
 * the first leg of a genuine bottom (needs both oscillators to bottom first).
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const stoch = ctx.stoch(14, 3, 1);
  const sma100 = ctx.sma(100, 1);
  const atr = ctx.atr(14, 1);
  if (bb == null || rsi == null || stoch == null || sma100 == null || atr == null) return null;
  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;

  if (pos <= 0) {
    // dual confirmation: lower band + RSI oversold + Stochastic oversold + crash gate
    if (price < bb.lower && rsi < 35 && stoch.k < 25 && price > sma100 * 0.97) {
      return { side: 'buy', qty: (cash / price) * 0.98 };
    }
    return null;
  } else {
    // exit at the mean / overbought, or ATR-scaled stop
    if (price > bb.mid || rsi > 65 || price < ctx.entryPx - 2.5 * atr) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
