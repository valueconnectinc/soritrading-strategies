/*
 * @coinsori-strategy v1
 * name: BTC RSI Mean-Reversion Dip 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: In a long-term uptrend, sharp short-term sell-offs
 * (oversold RSI) tend to bounce because the underlying trend is intact.
 * Buying those dips and selling the rebound is a mean-reversion bet — the
 * opposite of trend-following, so it diversifies the book.
 * When it buys and sells: buy when RSI(14) drops below 40 (mildly oversold)
 * while price is still above its 200-day average (long-term uptrend intact —
 * do not catch a falling knife in a bear). Sell when RSI recovers above 60
 * (the bounce is done) or price closes below the 200-day average (the
 * uptrend is broken, bail).
 * When it does NOT work: in a sustained bear market price keeps falling
 * through the 200-day average so it rarely buys; in a choppy sideways
 * market it buys dips that keep dipping and the 200-day filter does not
 * save it. It also sits in cash during strong rallies (no exposure), so it
 * trails buy-and-hold in raging bulls.
 */
function onUpdate(ctx) {
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  if (rsi == null || sma200 == null || closePrev == null) return null;

  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;

  if (pos <= 0) {
    // buy mildly-oversold dips while the long-term trend is still up
    if (rsi < 40 && closePrev > sma200) {
      const qty = (cash / price) * 0.6;
      return { side: 'buy', qty: qty };
    }
    return null;
  } else {
    // sell the rebound, or bail if the uptrend breaks
    if (rsi > 60 || closePrev < sma200) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
