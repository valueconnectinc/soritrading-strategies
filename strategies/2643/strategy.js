/*
 * @coinsori-strategy v1
 * name: OnChain-Gated Donchian BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: BTC spends long stretches trending, so a turtle-style
 * 55-day-high breakout rides those trends well — but it whipsaws in sideways
 * chop with false breakouts. This version adds an on-chain regime gate: it only
 * takes breakouts when BTC network health (hashrate and active addresses) is
 * not deteriorating. Healthy/holding network fundamentals filter out many of
 * the false breakouts that hurt the plain Donchian.
 * When it buys and sells: buys on a 55-day-high close while price is above the
 * 200-day average AND hashrate is above its 30-day average (network growing);
 * sells when the close falls below the 20-day low. Position risk-sized to 3%.
 * When it does NOT work: if on-chain data is missing/stale the gate silently
 * does nothing and it behaves like the plain Donchian; also still lags sharp
 * reversals and gives back money in prolonged chop when hashrate stays high
 * while price chops.
 */
function onUpdate(ctx) {
  const px = ctx.price;
  if (px == null) return null;

  const hi55 = ctx.high(55, 1);
  const lo20 = ctx.low(20, 1);
  const sma200 = ctx.sma(200, 1);
  if (hi55 == null || lo20 == null || sma200 == null) return null;

  // On-chain regime: hashrate and active addresses vs their 30-day averages.
  // If either is clearly deteriorating, treat the regime as weak.
  const hr = ctx.data('hashrate');
  const hrAvg = ctx.data('hashrate_sma30');
  const addr = ctx.data('addr');
  const addrAvg = ctx.data('addr_sma30');

  const pos = ctx.position;

  if (pos > 0) {
    if (px < lo20) return { side: 'sell', qty: pos };
    return null;
  }

  // Only consider a breakout when the network-health gate is not blocking.
  // Gate is "AND" — both on-chain series must not be in clear decline.
  // If data is missing (null), we do NOT block entry (fail-open), so the
  // strategy still trades when on-chain data is unavailable.
  const hrOk = (hr == null || hrAvg == null) ? true : (hr >= hrAvg);
  const addrOk = (addr == null || addrAvg == null) ? true : (addr >= addrAvg);
  const gateOk = hrOk && addrOk;

  if (px > hi55 && px > sma200 && gateOk) {
    const atr = ctx.atr(14, 1);
    if (atr == null) return { side: 'buy', qty: ctx.cash / px * 0.99 };
    const riskPerCoin = atr * 2;
    const qty = Math.min(ctx.cash / px * 0.99, (ctx.cash * 0.03) / riskPerCoin);
    return { side: 'buy', qty: qty };
  }
  return null;
}
