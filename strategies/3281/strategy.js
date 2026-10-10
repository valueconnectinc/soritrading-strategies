/*
 * @coinsori-strategy v1
 * name: Cross-Sectional Momentum Rotation 5-Asset
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, BNBUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Relative-strength rotation — in crypto the asset that has risen the
 * most over the last few months tends to keep outperforming, so we hold the #1 momentum
 * asset and switch only when another clearly overtakes it. When every asset's momentum is
 * negative we sit in cash instead of catching the falling knife.
 * When it buys and sells: Each day it ranks 5 assets by their 60-day return (from closed
 * bars). It holds the leader while its momentum stays positive; it switches to a challenger
 * only when the challenger beats the held asset by more than 5 points; it sells to cash when
 * the leader's momentum turns negative.
 * When it does NOT work: In choppy mean-reverting markets the leader whipsaws and switching
 * fees eat the edge; in a broad coordinated bear everything is negative so it sits in cash
 * and misses the eventual bottom. A single-asset melt-up of a laggard beats us by definition.
 */
function onUpdate(ctx) {
  const sym = ctx.sym;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  // 60-day momentum of THIS symbol from the last CLOSED bar (no look-ahead into the open bar).
  const prevClose = ctx.closes.at(-2);
  const close60 = ctx.closes.at(-62); // 60 bars before the last closed bar
  if (prevClose == null || close60 == null || close60 <= 0) return null;
  const ret = prevClose / close60 - 1;

  // Shared state across symbols: record this symbol's momentum for the current bar.
  if (!ctx.state.mom) ctx.state.mom = {};
  ctx.state.mom[sym] = { ret: ret, i: ctx.i };

  // Wait until every configured symbol has reported for this bar before ranking,
  // so the comparison is apples-to-apples on the same bar.
  const syms = ctx.syms || [sym];
  let all = true;
  for (const s of syms) {
    const m = ctx.state.mom[s];
    if (!m || m.i !== ctx.i) { all = false; break; }
  }
  if (!all) return null;

  // Rank all symbols by 60-day momentum.
  let best = null, bestRet = -Infinity;
  for (const s of syms) {
    const m = ctx.state.mom[s];
    if (m && m.ret > bestRet) { bestRet = m.ret; best = s; }
  }

  const pos = ctx.pos(sym);
  if (pos > 0) {
    const held = ctx.state.mom[sym] ? ctx.state.mom[sym].ret : 0;
    // Hard rule: leader momentum negative -> go to cash (protect capital in bear).
    if (bestRet < 0) return { side: 'sell', qty: pos };
    // Still the leader: hold.
    if (sym === best) return null;
    // Switch only if the challenger beats us by >5 points (avoids fee-churn on tiny flips).
    if (bestRet > held + 0.05) return { side: 'sell', qty: pos };
    return null;
  }

  // Flat: buy the leader only when its momentum is positive.
  if (sym === best && bestRet > 0) {
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }
  return null;
}
