/*
 * @coinsori-strategy v1
 * name: Data Probe Solana 1D MR
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: probe series availability for SOL 1d.
 * When it buys and sells: defensive mean-reversion baseline.
 * When it does NOT work: in melt-up markets.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  const ema20 = ctx.ema(20, 1);
  if (bb == null || rsi == null || sma200 == null || sma200prev == null || ema20 == null) return null;
  const pos = ctx.position;
  if (pos > 0) {
    if (price > ema20 || price < sma200) return { side: 'sell', qty: pos };
    return null;
  }
  if (sma200 > sma200prev && rsi < 30 && price < bb.lower) {
    return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
  }
  return null;
}
