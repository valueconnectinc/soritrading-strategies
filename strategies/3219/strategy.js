/*
 * @coinsori-strategy v1
 * name: On-Chain Hashrate Miner Regime BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin hashrate reflects miner conviction and network security.
 * Sustained hashrate growth historically accompanies accumulation phases, and hashrate
 * is a slow, low-noise series compared to price.
 * When it buys and sells: buys when hashrate is 2% above its 30-day average (miners
 * expanding), sells when it drops 2% below that average. The 2% hysteresis band stops
 * the frequent whipsaw that killed a plain threshold.
 * When it does NOT work: hashrate is slow — it lags price reversals, so sharp crashes
 * can hit before the signal flips. In liquidity-driven rallies with flat hashrate it
 * sits out the move.
 */
function onUpdate(ctx) {
  const hr = ctx.data('hashrate');
  const hrAvg = ctx.data('hashrate_sma30');
  if (hr == null || hrAvg == null || hrAvg <= 0) return null;

  const ratio = hr / hrAvg;

  // hysteresis: enter only above +2%, exit only below -2%
  if (ctx.position <= 0 && ratio > 1.02) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  if (ctx.position > 0 && ratio < 0.98) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
