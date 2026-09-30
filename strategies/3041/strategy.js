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
 * price tends to trend up. This is a trend-following regime filter built from
 * on-chain data (a different signal family than price mean-reversion).
 * When it buys and sells: Buy when the 30-day smoothed active-address level is above
 * its ~90-day average (sustained network growth) AND price is above its 200-day
 * average. Sell when network growth fades OR price breaks below the 50-day EMA (a
 * protective trend stop that limits deep drawdowns). A 20-bar cooldown after each
 * exit prevents churn.
 * When it does NOT work: In a bear market addresses decline and we stay flat (we lag
 * a sharp V-reversal off the bottom). It lags a melt-up where price soars but address
 * growth is already saturated. On-chain data updates daily, so it cannot react to
 * intraday news.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  // On-chain active addresses, 30-day smoothed, plus our own ~90-day EMA of it.
  const addrSma = ctx.data('addr_sma30');
  if (addrSma == null) return null;
  const addrEma = ctx.state.addrEma;
  const ema90 = addrEma == null ? addrSma : 0.011 * addrSma + 0.989 * addrEma; // ~90-day EMA (2/(90+1))
  ctx.state.addrEma = ema90;

  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  const ema50 = ctx.ema(50, 1);
  if (sma200 == null || sma200prev == null || ema50 == null) return null;

  const addrGrowing = addrSma > ema90;          // sustained network growth
  const uptrend = sma200 > sma200prev;           // price in established uptrend

  if (pos > 0) {
    // Protective trend stop: exit on fading network growth OR price below EMA50.
    if (!addrGrowing || price < ema50) {
      ctx.state.cooldown = ctx.i + 20;           // 20-bar cooldown to stop churn
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Cooldown after an exit prevents re-entry churn.
  if (ctx.state.cooldown != null && ctx.i < ctx.state.cooldown) return null;

  if (addrGrowing && uptrend) {
    const qty = (ctx.cash / price) * 0.95;
    return { side: 'buy', qty: qty };
  }
  return null;
}
