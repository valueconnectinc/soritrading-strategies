/*
 * @coinsori-strategy v1
 * name: BTC 4H Vol-Surge + ATR Trail + Hashrate Gate
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The champion (vol-surge breakout + 3x ATR trail) is solid
 *   but takes every breakout. Bitcoin hashrate is a fundamental on-chain metric:
 *   when it is above its own 30-day average the network is growing (miners
 *   investing), a healthy bullish backdrop. This gates the entry to only trade
 *   breakouts when hashrate is rising, aiming to avoid breakouts that fail in a
 *   weakening network.
 * When it buys and sells: Buy 20-bar-high breaks on above-average volume ONLY
 *   when current hashrate is above its 30-day average. Exit on the 3x ATR
 *   trailing stop.
 * When it does NOT work: Hashrate is slow-moving (daily scale) on a 4h strategy,
 *   so it may add little timing signal. In a miner capitulation the hashrate
 *   drops and can keep the strategy out of legitimately good long setups.
 *   Depends on the hashrate feed being available.
 */
function onUpdate(ctx) {
  let hh = -Infinity;
  for (let i = 1; i <= 20; i++) {
    const h = ctx.high(20, i);
    if (h == null) return null;
    if (h > hh) hh = h;
  }
  const price = ctx.price;
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(50);
  if (vol == null || avgVol == null) return null;

  const pos = ctx.position;
  if (pos > 0) {
    const atr = ctx.atr(14, 1);
    if (atr == null) return null;
    const s = ctx.state;
    if (s.highest == null || price > s.highest) s.highest = price;
    const stop = s.highest - 3 * atr;
    if (price < stop) return { side: 'sell', qty: pos };
    return null;
  }

  // On-chain gate: only enter when hashrate is above its 30-day average (growing network).
  const hr = ctx.data('hashrate');
  const hrAvg = ctx.data('hashrate_sma30');
  if (hr == null || hrAvg == null) return null;
  if (price > hh && vol > avgVol * 1.5 && hr > hrAvg) {
    ctx.state.highest = price;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
