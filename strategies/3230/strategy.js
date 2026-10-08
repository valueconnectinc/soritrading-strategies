/*
 * @coinsori-strategy v1
 * name: SOL 4H Squeeze Breakout
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: a volatility squeeze (Bollinger-band width compressed well
 * below its own average) is followed by a breakout through a 20-bar high — the
 * classic "calm before the storm" pattern. This family showed the only promising
 * non-momentum result in this job's ledger on SOL 4H.
 * When it buys and sells: buys when a closed bar closes above the highest close
 * of the PRIOR 20 bars (breakout bar excluded), the band was in a squeeze just
 * before, AND price is above its 200-bar average (uptrend only). Sells when a
 * closed bar closes below the lowest close of the prior 20 bars OR below the
 * 200-bar average (trend break).
 * When it does NOT work: in a slow grind that never squeezes (few trades), and in
 * chop where every squeeze breaks out and immediately reverses — the exits still
 * give back part of the move. Single symbol = no diversification.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  const n = closes.length;
  if (n < 80) return null;

  const prev = closes[n - 2];        // closed bar: identical in backtest and live
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;

  // Donchian 20-bar high/low from CLOSED bars, EXCLUDING the breakout bar itself.
  let hh = -Infinity, ll = Infinity;
  for (let i = n - 21; i <= n - 3; i++) {
    if (closes[i] > hh) hh = closes[i];
    if (closes[i] < ll) ll = closes[i];
  }

  // Squeeze measured on the bar BEFORE the breakout bar (end = n-3), so the
  // breakout bar's own band expansion cannot cancel the signal.
  let avgW = 0, curW = 0;
  for (let w = 1; w <= 50; w++) {
    const end = n - 2 - w;
    let sum = 0, sumSq = 0;
    for (let j = end - 19; j <= end; j++) {
      const c = closes[j];
      if (c == null) return null;
      sum += c; sumSq += c * c;
    }
    const mean = sum / 20;
    const std = Math.sqrt(Math.max(0, sumSq / 20 - mean * mean));
    if (mean <= 0) return null;
    const wd = std / mean;
    if (w === 1) curW = wd;
    avgW += wd;
  }
  avgW /= 50;
  const squeeze = curW < avgW * 0.9;

  const pos = ctx.position;
  if (pos > 0 && (prev < ll || prev < sma200)) {
    return { side: 'sell', qty: pos };
  }
  if (pos === 0 && prev > hh && squeeze && prev > sma200) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
