/*
 * @coinsori-strategy v1
 * name: BTC Fed-Rate Regime Trend 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin behaves like a high-beta risk asset: it tends to
 * rally when the Fed is easing or holding steady (cheap money) and suffers
 * during hiking cycles. The direction of the Fed funds rate is a slow macro
 * regime signal that filters out the worst bear phases.
 * When it buys and sells: buy when the Fed funds rate is not rising (no
 * hiking cycle) AND price is above its 100-day average. Sell when the Fed
 * starts hiking (rate clearly up) or price closes more than one ATR below
 * the 100-day average (a shallow dip no longer triggers an exit).
 * When it does NOT work: rate direction is very slow, so it cannot time the
 * exact top in a bull or bottom in a bear; in a choppy sideways regime with
 * no rate change it relies entirely on the price trend guard. It never beats
 * buy-and-hold in a raging bull. Requires the fed data feed to be online.
 */
function onUpdate(ctx) {
  const fed = ctx.data('fed');
  const sma = ctx.sma(100, 1);
  const atr = ctx.atr(14, 1);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  if (fed == null || sma == null || atr == null || closePrev == null) return null;

  // track the Fed funds rate history to detect a hiking cycle
  const hist = ctx.state.fedHist || [];
  hist.push(fed);
  if (hist.length > 400) hist.shift();
  ctx.state.fedHist = hist;

  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;
  let beenIn = ctx.state.beenIn || false;

  // hiking cycle = rate is clearly higher than ~90 days ago (a policy shift)
  const prev90 = hist.length >= 90 ? hist[hist.length - 90] : null;
  const hiking = prev90 != null && fed > prev90 * 1.01;

  if (pos <= 0) {
    if (prev90 == null) return null;
    // enter when not hiking and price above its 100-day trend
    if (!hiking && closePrev > sma) {
      const qty = (cash / price) * 0.6;
      ctx.state.beenIn = true;
      return { side: 'buy', qty: qty };
    }
    return null;
  } else {
    // exit when the Fed turns to hiking, or price breaks below the trend by
    // more than one ATR (shallow dips are ignored to avoid whipsaw)
    if (hiking || closePrev < sma - atr) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
