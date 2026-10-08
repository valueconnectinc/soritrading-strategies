/*
 * @coinsori-strategy v1
 * name: Momentum Rotation 4H (trend-filtered)
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: crypto leadership rotates — the strongest 21-bar momentum asset keeps outperforming until the regime flips; a trend filter avoids broad sell-offs where all assets fall together.
 * When it buys and sells: only the leader (best 21-bar return) is held, and only if its price is above its 100-bar average. Otherwise all flat. When the leader changes or falls below its average, sell.
 * When it does NOT work: choppy ranges where leadership flips often and fees eat the edge; a slow grind higher where momentum lags.
 */
function onUpdate(ctx) {
  const syms = ctx.syms || [ctx.sym];
  if (syms.length < 2) return null;

  const lookback = 21; // recent momentum window
  const trendLen = 100; // long average that defines uptrend
  let best = null, bestMom = -Infinity;
  const state = {};

  for (const s of syms) {
    let closes = null;
    if (s === ctx.sym) {
      closes = ctx.closes;
    } else {
      const m = ctx.market(s);
      if (m && Array.isArray(m.closes)) closes = m.closes;
    }
    if (!closes || closes.length < trendLen + lookback + 1) continue;
    const cur = closes[closes.length - 1];
    const prev = closes[closes.length - (lookback + 1)];
    if (cur == null || prev == null || prev === 0) continue;
    const mom = cur / prev - 1;
    // simple mean of last trendLen bars as trend proxy
    let sum = 0, cnt = 0;
    for (let k = 0; k < trendLen; k++) {
      const v = closes[closes.length - 1 - k];
      if (v != null) { sum += v; cnt++; }
    }
    const trendOk = cnt === trendLen ? cur > sum / trendLen : false;
    state[s] = { mom, trendOk };
    if (trendOk && mom > bestMom) { bestMom = mom; best = s; }
  }
  // best === null means no symbol is in an uptrend -> stay flat (cash)
  if (ctx.sym !== best) {
    if (ctx.position > 0) return { side: 'sell', qty: ctx.position };
    return null;
  }
  if (ctx.position <= 0) {
    return { side: 'buy', qty: (ctx.cash * 0.98) / ctx.price };
  }
  return null;
}
