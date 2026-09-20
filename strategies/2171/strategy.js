/*
 * @coinsori-strategy v1
 * name: BTC Fear-Dip Trend-Ride 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: combines two ideas — Fear & Greed tells us WHEN to buy
 * (only when the crowd is panicking, a contrarian entry), and the 200-day
 * trend tells us WHETHER we are in a bull (so we do not catch a falling knife
 * in a long bear). This captures bull markets by riding them while using fear
 * as a cheap entry timing.
 * When it buys and sells: buy when fear is high (<40) AND price is above its
 * 200-day average (dip in an uptrend). Hold while price stays above the 200-day
 * average; sell when price closes below it or greed turns extreme (>85).
 * When it does NOT work: in a bear market it stays in cash (no signal), so it
 * misses nothing but also earns nothing; in a choppy bull it can buy dips that
 * keep dipping.
 */
function onUpdate(ctx) {
  const fg = ctx.data('fear_greed');
  const sma = ctx.sma(200, 1);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  if (fg == null || sma == null || closePrev == null) return null;

  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;

  if (pos <= 0) {
    // Buy a fear dip only inside an uptrend (price above 200-SMA).
    if (fg <= 40 && closePrev > sma) {
      const qty = (cash / price) * 0.6;
      return { side: 'buy', qty: qty };
    }
    return null;
  } else {
    // Exit when the trend breaks or greed turns extreme.
    if (closePrev < sma || fg >= 85) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
