/*
 * @coinsori-strategy v1
 * name: BTC 1D Dual On-Chain (Addresses + Hashrate) Trend
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin's price follows real network health. Two independent
 * on-chain signals confirm a healthy trend: (1) active addresses growing = more
 * real users, (2) hashrate growing = miners investing more computing power into the
 * network. Requiring BOTH to rise together filters out weak rallies that only one
 * indicator supports. This is a trend-following regime filter from the on-chain
 * data family (different from price mean-reversion).
 * When it buys and sells: Buy when both the 30-day active-address level AND the
 * 30-day hashrate are above their own ~90-day averages (network genuinely expanding)
 * and price is above its 200-day average. Sell when either on-chain signal fades
 * (address growth or hashrate growth breaks down) — a slow, decisive exit. A 20-bar
 * cooldown after each exit stops churn.
 * When it does NOT work: In a bear market both signals decline and we stay flat
 * (defensive, so we lag a sharp V-reversal off the bottom). It lags a melt-up where
 * price soars but mining hashrate is already saturated. On-chain data updates daily,
 * so it cannot react to intraday news.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  // Two on-chain regime signals: active addresses (usage) and hashrate (miner commitment).
  const addrSma = ctx.data('addr_sma30');
  const hashSma = ctx.data('hashrate_sma30');
  if (addrSma == null || hashSma == null) return null;

  // Own ~90-day EMAs of each smoothed on-chain series.
  const addrEma = ctx.state.addrEma;
  const emaAddr = addrEma == null ? addrSma : 0.011 * addrSma + 0.989 * addrEma; // 2/(90+1)
  ctx.state.addrEma = emaAddr;
  const hashEma = ctx.state.hashEma;
  const emaHash = hashEma == null ? hashSma : 0.011 * hashSma + 0.989 * hashEma;
  ctx.state.hashEma = emaHash;

  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  if (sma200 == null || sma200prev == null) return null;

  const addrGrowing = addrSma > emaAddr;   // network usage expanding
  const hashGrowing = hashSma > emaHash;   // miner investment expanding
  const uptrend = sma200 > sma200prev;     // price in established uptrend

  if (pos > 0) {
    // Exit when EITHER on-chain signal fades — decisive but slow.
    if (!addrGrowing || !hashGrowing) {
      ctx.state.cooldown = ctx.i + 20;     // 20-bar cooldown to stop churn
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Cooldown after an exit prevents re-entry churn.
  if (ctx.state.cooldown != null && ctx.i < ctx.state.cooldown) return null;

  if (addrGrowing && hashGrowing && uptrend) {
    const qty = (ctx.cash / price) * 0.95;
    return { side: 'buy', qty: qty };
  }
  return null;
}
