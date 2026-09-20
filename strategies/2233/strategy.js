/*
 * @coinsori-strategy v1
 * name: BTC ATR Trailing Trend 4h (wide)
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: A trend-follower (opposite family from mean reversion).
 * The first 55-bar/3*ATR version failed badly — the stop was too tight for BTC
 * 4h noise and it whipsawed on fake breakouts. This refinement widens the
 * breakout window to 100 bars (only the strongest breakouts qualify) and widens
 * the trailing stop to 5*ATR so normal pullbacks don't knock it out. The bet is
 * that sustained BTC trends are real and a wide enough stop survives the noise.
 * When it buys and sells: buy when price closes above the highest high of the
 * last 100 bars. While long, trail a stop at the highest close since entry
 * minus 5*ATR; exit when price closes below it.
 * When it does NOT work: in a long sideways / choppy market even a 100-bar
 * breakout gets faked and the wide stop still gets hit eventually. A wide stop
 * also means bigger losses per failed trade and bigger give-back on reversals.
 */
function onUpdate(ctx) {
  const atr = ctx.atr(14, 1);
  if (atr == null) return null;
  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;
  const high = ctx.high(100, 1);
  if (high == null) return null;

  if (pos <= 0) {
    if (price > high) {
      return { side: 'buy', qty: (cash / price) * 0.98 };
    }
    return null;
  } else {
    const peak = ctx.state && ctx.state.peak ? ctx.state.peak : price;
    const newPeak = Math.max(peak, price);
    ctx.state = ctx.state || {};
    ctx.state.peak = newPeak;
    const stop = newPeak - 5 * atr;
    if (price < stop) {
      ctx.state.peak = null;
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
