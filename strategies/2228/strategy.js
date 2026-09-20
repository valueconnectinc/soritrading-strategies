/*
 * @coinsori-strategy v1
 * name: DOGE BB-RSI Mean Reversion 4H
 * ex: binance
 * syms: DOGEUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Mean reversion is a genuinely different family from the
 * trend-following champion. On small-cap alts like XRP, SUI and AVAX the
 * Bollinger lower-band + RSI oversold dip-buy proved promising — these coins
 * range and snap back to the mean more than they trend. DOGE is another
 * high-volatility alt with the same mean-reverting chop.
 * When it buys and sells: buy when price touches the lower Bollinger band AND
 * RSI is oversold (<35), sell back to the middle band (mean) or when RSI turns
 * overbought (>65).
 * When it does NOT work: in a strong sustained bull (parabolic) the lower band
 * is rarely touched so it sits in cash and misses the melt-up; in a violent
 * crash it catches falling knives at the lower band.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  if (bb == null || rsi == null) return null;
  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;

  if (pos <= 0) {
    // buy a dip at the lower band with oversold RSI
    if (price < bb.lower && rsi < 35) {
      return { side: 'buy', qty: (cash / price) * 0.98 };
    }
    return null;
  } else {
    // exit back at the mean (middle band) or when RSI turns overbought
    if (price > bb.mid || rsi > 65) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
