/*
 * @coinsori-strategy v1
 * name: BTC Bollinger Mean-Reversion 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: In a long-term uptrend, price that stretches down to
 * the lower Bollinger band is statistically stretched too far and tends to
 * snap back toward the middle band. Buying that stretch and selling the
 * reversion is a mean-reversion bet — the opposite of trend-following, so
 * it diversifies the book.
 * When it buys and sells: buy when price touches the lower Bollinger band
 * (20-day, 2 std) while price is still above its 200-day average (uptrend
 * intact — do not catch a falling knife). Sell when price reverts up to the
 * middle band (20-day average) or price closes below the 200-day average
 * (trend broken, bail).
 * When it does NOT work: in a sustained bear market price keeps falling
 * through the lower band and the 200-day filter does not save it; in a
 * strong rally it rarely touches the lower band so it sits in cash and
 * trails buy-and-hold.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const sma200 = ctx.sma(200, 1);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  if (bb == null || sma200 == null || closePrev == null) return null;

  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;

  if (pos <= 0) {
    // buy stretched-to-lower-band dips while the long-term trend is up
    if (closePrev <= bb.lower && closePrev > sma200) {
      const qty = (cash / price) * 0.6;
      return { side: 'buy', qty: qty };
    }
    return null;
  } else {
    // sell the reversion to the middle band, or bail if the uptrend breaks
    if (closePrev >= bb.mid || closePrev < sma200) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
