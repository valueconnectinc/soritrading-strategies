/*
 * @coinsori-strategy v1
 * name: BTC 1D On-Chain Network Trend
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin's price ultimately follows network adoption. When the
 * number of active addresses (real users) is growing, the network is expanding and
 * price tends to trend up; when addresses stall or fall, the rally runs out of fuel.
 * This is a trend-following regime filter built from on-chain data (a different
 * signal family than price mean-reversion) — it rides healthy uptrends and steps out
 * when network growth fades.
 * When it buys and sells: Buy when active addresses are above their 30-day average
 * (network growing) AND price is above its 200-day average (established uptrend).
 * Sell when active addresses fall back below their 30-day average (growth fading)
 * or price breaks below its 20-day EMA (momentum loss).
 * When it does NOT work: In a bear market active addresses decline and we stay flat
 * (defensive, so we lag any sharp V-reversal off the bottom). It also lags in a
 * melt-up where price soars but address growth is already saturated. On-chain data
 * updates daily, so it cannot react to intraday news.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  // On-chain active addresses (network health). null = data not available yet.
  const addr = ctx.data('addr');
  const addrSma = ctx.data('addr_sma30');
  if (addr == null || addrSma == null) return null;

  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  const ema20 = ctx.ema(20, 1);
  if (sma200 == null || sma200prev == null || ema20 == null) return null;

  const addrGrowing = addr > addrSma;          // network expanding
  const uptrend = sma200 > sma200prev;          // price in established uptrend

  if (pos > 0) {
    // Exit when network growth fades or short-term momentum breaks.
    if (!addrGrowing || price < ema20) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (addrGrowing && uptrend) {
    const qty = (ctx.cash / price) * 0.95;
    return { side: 'buy', qty: qty };
  }
  return null;
}
