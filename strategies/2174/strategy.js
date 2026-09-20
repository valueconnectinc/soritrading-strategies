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
 * smoothed active addresses are higher than 60 days ago. Sell when price
 * closes more than one ATR below the 100-day average, or when active
 * addresses drop sharply (network losing users).
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
  const prev60 = hist.length >= 60 ? hist[hist.length - 60] : null;
  hist.push(aa);
  if (hist.length > 120) hist.shift();
  ctx.state.hist = hist;

  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;

  if (pos <= 0) {
    if (prev60 == null) return null;
    // network activity must be growing to confirm the uptrend (real usage)
    const aaRising = aa > prev60 * 1.01;
    const aboveSma = closePrev > sma;
    if (aboveSma && aaRising) {
      const qty = (cash / price) * 0.6;
      return { side: 'buy', qty: qty };
    }
    return null;
  } else {
    // exit on price breakdown below SMA-ATR, or network activity collapsing
    const breakDown = closePrev < sma - atr;
    const aaCollapse = (prev60 != null && aa < prev60 * 0.97);
    if (breakDown || aaCollapse) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
