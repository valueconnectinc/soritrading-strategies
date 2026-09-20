/*
 * @coinsori-strategy v1
 * name: ETH Daily Bollinger Volatility Breakout 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated ETH 200-SMA trend champion exits early in
 * strong melt-ups (its documented weakness) because it waits for a full close
 * below the slow average. This is a different, volatility-expansion family:
 * ETH often makes sharp directional breakouts, and a close through the upper
 * Bollinger band marks a momentum expansion worth riding.
 * When it buys and sells: buy when the daily close pierces the upper Bollinger
 * band (volatility breakout), sell when the close falls back below the middle
 * band (the momentum expansion has faded). Stays out during quiet chop.
 * When it does NOT work: in a slow grind-up without band-touching closes it
 * never enters and misses the whole move; in a ranging market band-touches are
 * false breakouts that whipsaw. It needs real volatility expansion to work.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1); // previous closed bar's bands
  const bbP = ctx.bb(20, 2, 2);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  const closePrev2 = ctx.closes[ctx.closes.length - 3];
  if (bb == null || bbP == null || closePrev == null || closePrev2 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const cash = ctx.cash;

  if (pos <= 0) {
    // breakout: previous close was inside/at band, now closes above upper band
    if (closePrev2 <= bbP.upper && closePrev > bb.upper) {
      return { side: 'buy', qty: (cash / price) * 0.98 };
    }
    return null;
  }

  // exit when the close falls back below the middle band (momentum faded)
  if (closePrev < bb.mid) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
