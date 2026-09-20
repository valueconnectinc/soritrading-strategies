/*
 * @coinsori-strategy v1
 * name: BTC Fed-Regime Trend v3 Loose-Exit 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin is a risk asset pressured when the Fed hikes and
 * supported when it cuts or holds. The Fed funds rate direction is a slow macro
 * regime filter. On top we add a 50-day trend guard, scale the position by trend
 * strength, and use a looser 1.5-ATR exit so shallow dips in a choppy bull do
 * not shake us out (fewer whipsaw trades).
 * When it buys and sells: buy when the Fed is NOT hiking AND price is above its
 * 50-day average (full position when well above, half when barely above). Sell
 * when the Fed starts hiking OR price closes more than 1.5 ATR below the 50-day
 * average.
 * When it does NOT work: in a raging bull it still trails buy-and-hold; with a
 * flat/early Fed history the gate is silent and only the price guard protects;
 * it needs the fed data feed.
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
      const strength = (closePrev - sma) / atr;
      let frac = 0.5;
      if (strength > 1.5) frac = 0.98;
      else if (strength > 0.5) frac = 0.75;
      return { side: 'buy', qty: (cash / price) * frac };
    }
    return null;
  } else {
    // looser 1.5-ATR exit: only exit on a real breakdown, not a shallow dip
    const breakDown = closePrev < sma - atr * 1.5;
    if (hiking || breakDown) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
