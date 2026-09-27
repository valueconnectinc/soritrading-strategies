/*
 * @coinsori-strategy v1
 * name: Momentum Rotation Defensive 1D
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, BNBUSDT, ADAUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Cross-sectional momentum — capital rotates to the strongest
 * of several crypto assets, betting that relative strength persists from month to
 * month. Unlike a single-asset trend strategy, rotation rides whichever asset is
 * melting up, directly attacking the melt-up-lag weakness of the dual-mode champion.
 * When it buys and sells: every 60 daily bars it ranks the basket by trailing 90-day
 * return and holds the single strongest asset, but ONLY if that asset's momentum is
 * positive. If the leader's momentum is negative (broad bear market), it holds cash.
 * It sells any position that loses the lead or turns negative.
 * When it does NOT work: in a tight chop where leadership flips every month it churns
 * fees without edge; and the single-winner bet concentrates risk (no diversification).
 */
function onUpdate(ctx) {
  const syms = ctx.syms;
  if (!syms || syms.length < 2) return null;

  const MOM = 90;    // momentum lookback in bars (3 months on 1d)
  const REBAL = 60;  // rebalance every N bars

  // Rebalance only on schedule; otherwise do nothing.
  if (ctx.i % REBAL !== 0) return null;

  // Score every symbol by trailing return.
  const scored = [];
  for (const s of syms) {
    const m = ctx.market(s);
    if (!m) continue;
    const closes = m.closes;
    if (!closes || closes.length < MOM + 1) continue;
    const c0 = closes[closes.length - 1];
    const c1 = closes[closes.length - 1 - MOM];
    if (!Number.isFinite(c0) || !Number.isFinite(c1) || c1 <= 0) continue;
    scored.push({ s: s, ret: c0 / c1 - 1 });
  }
  if (scored.length < 2) return null;

  scored.sort((a, b) => b.ret - a.ret);
  const best = scored[0];

  const orders = [];

  // Defensive mode: if the strongest asset has negative momentum, stand in cash.
  // (In a broad bear everything falls; holding the 'least-bad' still loses.)
  if (best.ret <= 0) {
    for (const s of syms) {
      const p = ctx.pos(s);
      if (p > 0) orders.push({ sym: s, side: 'sell', qty: p });
    }
    return orders.length ? orders : null;
  }

  // Sell any position not in the lead.
  for (const s of syms) {
    const p = ctx.pos(s);
    if (p > 0 && s !== best.s) {
      orders.push({ sym: s, side: 'sell', qty: p });
    }
  }

  // Buy/keep the leader with the full portfolio.
  const m = ctx.market(best.s);
  if (!m || !Number.isFinite(m.price) || m.price <= 0) return orders.length ? orders : null;
  const have = ctx.pos(best.s) || 0;
  const want = (ctx.cash / m.price) * 0.98;
  const diff = want - have;
  if (diff > 0.0001) {
    orders.push({ sym: best.s, side: 'buy', qty: diff });
  }

  return orders.length ? orders : null;
}
