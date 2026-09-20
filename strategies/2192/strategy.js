/*
 * @coinsori-strategy v1
 * name: BTC Fed-Regime Trend v4 Full-Bull 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin is a risk asset pressured when the Fed hikes and
 * supported when it cuts or holds. The Fed funds rate direction is the slow
 * macro regime that separates bear from bull. In a non-hiking bull we go to a
 * full position whenever price is above the 50-day average, because the Fed
 * gate is the real signal there — scaling down to half when price hovers near
 * the average leaves us perpetually underweight in a choppy bull.
 * When it buys and sells: buy a full position when the Fed is NOT hiking AND
 * price is above its 50-day average. Sell when the Fed starts hiking OR price
 * closes more than one ATR below the 50-day average.
 * When it does NOT work: in a raging bull it still trails buy-and-hold (the
 * entry guard adds a little friction); with a flat/early Fed history the gate
 * is silent and only the price guard protects; it needs the fed data feed.
 */
function onUpdate(ctx) {
  const fed = ctx.data('fed');
  const sma = ctx.sma(50, 1);
  const atr = ctx.atr(14, 1);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  if (fed == null || sma == null || atr == null || closePrev == null) return null;

  const fedHist = ctx.state.fedHist || [];
  fedHist.push(fed);
  if (fedHist.length > 400) fedHist.shift();
  ctx.state.fedHist = fedHist;
  const prev90 = fedHist.length >= 90 ? fedHist[fedHist.length - 90] : null;
  // hiking = Fed funds rate clearly up vs ~90 days ago
  const hiking = prev90 != null && fed > prev90 * 1.01;

  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;

  if (pos <= 0) {
    if (prev90 == null) return null;
    const aboveSma = closePrev > sma;
    if (aboveSma && !hiking) {
      // full position whenever above trend in a non-hiking regime
      return { side: 'buy', qty: (cash / price) * 0.98 };
    }
    return null;
  } else {
    const breakDown = closePrev < sma - atr;
    if (hiking || breakDown) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
