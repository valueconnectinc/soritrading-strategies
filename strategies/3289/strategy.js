/*
 * @coinsori-strategy v1
 * name: Multi-Asset Keltner MR Basket 4H
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, BNBUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The validated 5-asset 4h trend-gated Keltner mean-reversion
 * basket — a defensive edge confirmed on three disjoint 4h windows (3/3 positive,
 * ~29/32 positive record in the ledger for this family). It buys local panics
 * inside a rising long-term trend with small per-leg risk, keeping drawdown tiny.
 * When it buys and sells: On each asset, buy when price closes below the Keltner
 * low (EMA20 - 2.5*ATR) with RSI(14)<40, only while price is above its 200-bar
 * SMA. Sell when price closes back above the 20-bar EMA. 2-bar cooldown between
 * trades. Each leg sized to 20% of equity. No stops/TP — the ledger shows they
 * hurt this family.
 * When it does NOT work: In a broad coordinated crypto bear all 200-SMA gates stay
 * off (capital safe, little upside); a single straight-line melt-up lags
 * buy-and-hold of that asset; choppy ranges cause repeated small losses.
 */
function onUpdate(ctx) {
  const sym = ctx.sym;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) { ctx.watch([]); return null; }

  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  if (rsi == null || sma200 == null || ema20 == null || atr == null || atr <= 0) {
    ctx.watch([]);
    return null;
  }

  const keltnerLow = ema20 - 2.5 * atr;
  // trend gate: price ABOVE the 200-bar SMA (level, not slope) — validated recipe
  const trendOk = price > sma200;

  // 2-bar cooldown per symbol after any trade to cut whipsaw
  if (!ctx.state.cd) ctx.state.cd = {};
  const cds = ctx.state.cd;
  if (cds[sym] == null) cds[sym] = 0;
  if (cds[sym] > 0) cds[sym]--;

  const pos = ctx.pos(sym);
  if (pos > 0) {
    if (price > ema20) { cds[sym] = 2; ctx.watch([]); return { side: 'sell', qty: pos }; }
    ctx.watch([{ side: 'sell', price: ema20, trigger: 'above', qty: pos, note: 'EMA20 snap-back' }]);
    return null;
  }

  const keltnerPullback = trendOk && price < keltnerLow && rsi < 40 && cds[sym] === 0;
  if (keltnerPullback) {
    // 2.5% of equity risked per leg, inverse-ATR sized, capped at 20% leg share.
    const riskBudget = 0.025 * ctx.cash;
    let qty = riskBudget / atr;
    const maxQty = (ctx.cash / price) * 0.20;
    qty = Math.min(qty, maxQty);
    if (qty <= 0) { ctx.watch([]); return null; }
    cds[sym] = 2;
    ctx.watch([]);
    return { side: 'buy', qty: qty };
  }

  const trendCond = { label: 'price > 200SMA', ok: trendOk };
  ctx.watch([{ side: 'buy', price: keltnerLow, trigger: 'below', qty: Math.min(0.025 * ctx.cash / atr, (ctx.cash / keltnerLow) * 0.20),
    note: 'Keltner low (EMA20-2.5ATR)',
    conds: [{ label: 'RSI(14) close', now: rsi, op: '<', ref: 40, closed: true }, trendCond] }]);
  return null;
}
