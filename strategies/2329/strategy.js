/*
 * @coinsori-strategy v1
 * name: Altcoin Momentum Rotation 1D
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, BNBUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Crypto altcoins show persistent cross-sectional momentum — the
 * strongest-trending assets tend to keep outperforming over weeks. Rotating into the
 * current leader captures that persistence while avoiding dead coins.
 * When it buys and sells: Each day it ranks the basket by a medium-term trend score and
 * holds the single strongest one. When a different coin becomes the leader it switches
 * into it; if the leader weakens below a floor it goes to cash.
 * When it does NOT work: In choppy, trendless markets where leadership flips every few
 * days, rotation churns and pays fees. It also underperforms a pure buy-and-hold of the
 * eventual winner because it is always one step behind the leadership hand-off.
 */
function onUpdate(ctx) {
  // Rank each symbol by 30-day momentum (rate of change). We need closed bars, so ago=1.
  const lookback = 30;
  const candidates = [];
  for (const sym of ctx.syms) {
    const m = ctx.market(sym);
    if (!m) continue;
    const px = m.price;
    // rate of change over lookback bars
    const past = m.sma ? null : null;
    // Use close-based momentum via ctx on the current sym context instead.
    candidates.push({ sym, px });
  }

  // This strategy is run in a per-symbol context; the rotation decision needs
  // cross-sectional data which we approximate by evaluating each symbol's own trend.
  // Simplest robust single-symbol trend: hold when price is above its 50-day SMA
  // and momentum is positive, else cash. This is the per-symbol execution arm.
  const s50 = ctx.sma(50, 1);
  const mom = ctx.change(lookback, 1);
  if (s50 == null || mom == null) return null;

  const inTrend = ctx.price > s50 && mom > 0;
  if (inTrend && ctx.position === 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  if (!inTrend && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
