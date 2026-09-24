/*
 * @coinsori-strategy v1
 * name: ETH Volume-Confirmed Donchian 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: In crypto, sustained breakouts above a long consolidation
 * range tend to persist for weeks. Requiring at least average volume on the breakout
 * bar filters out the weakest false breakouts that whipsaw a plain channel system.
 * When it buys and sells: Buy when price closes above the 55-day high AND that bar's
 * volume is at least the 20-day average volume. Sell when price closes below the
 * 30-day low (a wide trailing exit that lets winners run).
 * When it does NOT work: In steady grind-up rallies with no volume surge it misses the
 * move, and in choppy sideways markets the 55-day high is rarely cleared so it sits in
 * cash. It is not crash protection and underperforms buy-and-hold in calm bulls.
 */
function onUpdate(ctx) {
  const N = 55, EXIT = 30, VOL = 20;
  const closes = ctx.closes;
  const vols = ctx.volumes;
  if (closes == null || closes.length < N + 3) return null;

  const prev = closes[closes.length - 2];

  let hi55 = -Infinity;
  for (let k = 3; k <= N + 2; k++) {
    const c = closes[closes.length - k];
    if (c != null && c > hi55) hi55 = c;
  }
  let lo30 = Infinity;
  for (let k = 2; k <= EXIT + 1; k++) {
    const c = closes[closes.length - k];
    if (c != null && c < lo30) lo30 = c;
  }
  if (hi55 === -Infinity || lo30 === Infinity) return null;

  let vSum = 0, vN = 0;
  if (vols != null) {
    for (let k = 2; k <= VOL + 1; k++) {
      const v = vols[vols.length - k];
      if (v != null && v > 0) { vSum += v; vN++; }
    }
  }
  const avgVol = vN > 0 ? vSum / vN : null;
  const lastVol = vols != null ? vols[vols.length - 2] : null;

  // Volume-confirmed breakout on the last closed bar (>= average volume).
  const breakout =
    prev > hi55 &&
    avgVol != null && lastVol != null && lastVol >= avgVol;

  if (ctx.position === 0) {
    if (breakout && ctx.cash > 0 && ctx.price > 0) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
    }
    return null;
  }

  if (prev < lo30 && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
