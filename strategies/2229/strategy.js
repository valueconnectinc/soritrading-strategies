/*
 * @coinsori-strategy v1
 * name: LINK BB-RSI Mean Reversion 4H
 * ex: binance
 * syms: LINKUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Same proven BB+RSI mean-reversion family that worked on
 * XRP, SUI, AVAX and DOGE. LINK is another small-cap alt with mean-reverting
 * chop. This is a fair out-of-sample test of whether the family generalizes to
 * a fresh symbol.
 * When it buys and sells: buy when price touches the lower Bollinger band AND
 * RSI is oversold (<35), sell back to the middle band (mean) or when RSI turns
 * overbought (>65).
 * When it does NOT work: in a strong sustained bull the lower band is rarely
 * touched so it sits in cash and misses the melt-up; in a violent crash it
 * catches falling knives at the lower band.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  if (bb == null || rsi == null) return null;
  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;

  if (pos <= 0) {
    if (price < bb.lower && rsi < 35) {
      return { side: 'buy', qty: (cash / price) * 0.98 };
    }
    return null;
  } else {
    if (price > bb.mid || rsi > 65) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
