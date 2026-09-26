/*
 * @coinsori-strategy v1
 * name: Onchain Sma30 Probe
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Diagnostic probe for the addr_sma30 dataset. Buys whenever
 * ctx.data('addr_sma30') is a usable finite number, so the trade count reveals
 * whether that derived dataset populates per-bar (the addr probe traded, so the
 * raw key is live; this checks the smoothed key).
 * When it buys and sells: buys when the value is usable, sells when not.
 * When it does NOT work: if the key is null, the probe stays flat.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const raw = ctx.data('addr_sma30');
  const n = Number(raw);
  const usable = Number.isFinite(n) && n > 0;
  if (pos > 0) {
    if (!usable) return { side: 'sell', qty: pos };
    return null;
  }
  if (usable) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
