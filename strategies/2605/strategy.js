/*
 * @coinsori-strategy v1
 * name: Squeeze Breakout BTC+ETH 1D Vol-Adaptive Size
 * ex: binance
 * syms: BTCUSDT, ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Low-volatility coiling (Bollinger band-width contracting
 * below its own recent average) is followed by a sharp expansion move. Betting
 * on the expansion side, confirmed by a volume surge, captures the start of new
 * directional trends. Running on TWO large-cap majors keeps capital working when
 * one symbol is quiet. This version adds volatility-adaptive position sizing:
 * when ATR is elevated relative to its own recent average (hot market), it takes
 * a smaller position, which trims drawdown in violent regimes.
 * When it buys and sells: buys when band-width is below its 20-bar average AND
 * price closes above the upper Bollinger band AND volume > 1.5x its 20-day
 * average. Exits on a 2.5x-ATR stop or a 20-day low trail. Position size scales
 * down as ATR rises above its 20-day average.
 * When it does NOT work: choppy sideways markets where a squeeze resolves with a
 * failed breakout; bear markets where the breakout is a bull trap. It lags very
 * strong straight-line bull runs because it waits for fresh coiling.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const atr = ctx.atr(14, 1);
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(20);
  if (bb == null || atr == null || vol == null || avgVol == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (price <= ctx.entryPx - atr * 2.5) return { side: 'sell', qty: pos };
    const ll20 = ctx.low(20, 1);
    if (ll20 != null && price < ll20) return { side: 'sell', qty: pos };
    return null;
  }

  // Squeeze: current band width is below its 20-bar average (coiling).
  const bw = (bb.upper - bb.lower) / bb.middle;
  let sum = 0, cnt = 0;
  for (let k = 1; k <= 20; k++) {
    const b = ctx.bb(20, 2, k);
    if (b == null) break;
    sum += (b.upper - b.lower) / b.middle;
    cnt++;
  }
  if (cnt < 20) return null;
  const avgBw = sum / cnt;
  if (bw >= avgBw) return null;

  // Expansion trigger: volume surge + close above the upper band.
  if (vol > avgVol * 1.5 && price > bb.upper) {
    // Vol-adaptive sizing: scale position down as ATR rises above its 20-day avg.
    // Full size when ATR is at/below average; half size at 2x average ATR.
    let atrSum = 0, atrCnt = 0;
    for (let k = 1; k <= 20; k++) {
      const a = ctx.atr(14, k);
      if (a == null) break;
      atrSum += a;
      atrCnt++;
    }
    let size = 1;
    if (atrCnt >= 20) {
      const avgAtr = atrSum / atrCnt;
      const ratio = atr / avgAtr;
      // Linear scale from 1.0 (quiet) down to 0.4 (very hot, ratio >= 2.5).
      size = Math.max(0.4, Math.min(1, 1.6 - ratio * 0.6));
    }
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 * size };
  }
  return null;
}
