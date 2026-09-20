/*
 * @coinsori-strategy v1
 * name: BTC Active-Address Trend Confirmation 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin's daily active addresses measure real network
 * usage. When both price is trending up AND network activity is growing, the
 * rally is backed by users actually engaging — a more durable move than a
 * price-only breakout. This confirms trend-following entries and avoids
 * entering rallies that no one is participating in.
 * When it buys and sells: buy when price is above its 100-day average AND
 * the 10-day mean of active addresses is above its 60-day mean (the short
 * activity trend is up). Sell when price closes more than one ATR below the
 * 100-day average, or when the short activity trend turns down.
 * When it does NOT work: active addresses can lag price, so it may enter
 * late in a fast rally; in a raging bull it still trails buy-and-hold; and
 * if address data has gaps the signal turns off (stays in cash, which is
 * safe but misses moves).
 */
function onUpdate(ctx) {
  const aa = ctx.data('addr');
  const sma = ctx.sma(100, 1);
  const atr = ctx.atr(14, 1);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  if (aa == null || sma == null || atr == null || closePrev == null) return null;

  const hist = ctx.state.hist || [];
  hist.push(aa);
  if (hist.length > 120) hist.shift();
  ctx.state.hist = hist;

  // short activity trend: 10-day mean vs 60-day mean (in-state)
  if (hist.length < 60) return null;
  let s10 = 0, s60 = 0;
  for (let i = 0; i < hist.length; i++) {
    if (i >= hist.length - 10) s10 += hist[i];
    s60 += hist[i];
  }
  s10 /= 10;
  s60 /= hist.length;

  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;

  if (pos <= 0) {
    const activityUp = s10 > s60 * 1.001; // short usage trend up
    const aboveSma = closePrev > sma;
    if (aboveSma && activityUp) {
      const qty = (cash / price) * 0.6;
      return { side: 'buy', qty: qty };
    }
    return null;
  } else {
    const breakDown = closePrev < sma - atr;
    const activityDown = s10 < s60 * 0.999;
    if (breakDown || activityDown) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
