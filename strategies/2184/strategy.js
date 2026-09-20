/*
 * @coinsori-strategy v1
 * name: BTC Active-Address Network Growth 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin's daily active addresses measure real user
 * adoption. Unlike the hashrate strategy (which tracks mining power), this
 * treats NETWORK USAGE as the primary trend driver: when more people are
 * actively using the network, the rally is durable; when usage dries up,
 * the move is not backed by real demand. Price is only a secondary
 * confirmation, so this can enter a trend even while price is still
 * consolidating.
 * When it buys and sells: buy when smoothed active addresses are above their
 * level 60 days ago (network growing) AND price is above its 50-day average.
 * Sell when smoothed active addresses fall below their 60-day-ago level, or
 * price closes below its 100-day average (a hard regime break).
 * When it does NOT work: active addresses can lag or flatline during fast
 * price rallies, so it may sit in cash in a raging bull; it never beats
 * buy-and-hold in a straight bull; and if address data has gaps the signal
 * turns off entirely (stays in cash, safe but misses moves).
 */
function onUpdate(ctx) {
  const aa = ctx.data('addr');
  const sma50 = ctx.sma(50, 1);
  const sma100 = ctx.sma(100, 1);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  if (aa == null || sma50 == null || sma100 == null || closePrev == null) return null;

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
    // network usage must be growing vs 60 days ago (real adoption trend)
    const networkUp = aa > prev60 * 1.01;
    const priceUp = closePrev > sma50;
    if (networkUp && priceUp) {
      const qty = (cash / price) * 0.6;
      return { side: 'buy', qty: qty };
    }
    return null;
  } else {
    // exit when usage turns down, or a hard 100-day regime break
    const networkDown = (prev60 != null && aa < prev60 * 0.99);
    const regimeBreak = closePrev < sma100;
    if (networkDown || regimeBreak) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
