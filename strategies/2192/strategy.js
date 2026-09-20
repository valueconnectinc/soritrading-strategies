/*
 * @coinsori-strategy v1
 * name: BTC Fed-Regime Trend 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin is a risk asset that is pressured when the Fed is
 * hiking (tightening liquidity) and supported when the Fed is cutting or on
 * hold. This strategy uses the Fed funds rate direction as a slow macro regime
 * filter on top of a 100-day price trend guard: it stays in BTC only while the
 * Fed is NOT hiking and price is above its trend. This is a macro-regime
 * family, different from the on-chain hashrate and price-trend strategies.
 * When it buys and sells: buy when the Fed funds rate is not clearly higher
 * than ~90 days ago AND price is above its 100-day average. Sell when the Fed
 * starts hiking OR price closes more than one ATR below the 100-day average
 * (shallow dips ignored to avoid whipsaw).
 * When it does NOT work: in a raging bull it still trails buy-and-hold (the
 * regime gate adds friction); with a flat/early Fed history (2017-18) the gate
 * is silent and only the price guard protects; it needs the fed data feed.
 */
function onUpdate(ctx) {
  const fed = ctx.data('fed');
  const sma = ctx.sma(100, 1);
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
      return { side: 'buy', qty: (cash / price) * 0.6 };
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
