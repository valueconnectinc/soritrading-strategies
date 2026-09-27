/*
 * @coinsori-strategy v1
 * name: Macro-Gated Keltner MR BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Diagnostic build — verify whether ctx.macro('dxy'/'ndx')
 * returns real values in the backtest environment, by logging them periodically.
 * The macro-gate idea only matters if the feed is actually available.
 * When it buys and sells: same Keltner MR recipe as the champion.
 * When it does NOT work: n/a (diagnostic).
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const sma200 = ctx.sma(200, 1);
  const rsi = ctx.rsi(14, 1);
  if (ema20 == null || atr == null || sma200 == null || rsi == null || atr <= 0) return null;

  const lower = ema20 - 2.5 * atr;
  const st = ctx.state;

  // Diagnostic: log macro availability every 250 bars
  if (st.nextLog == null || ctx.i >= st.nextLog) {
    const dxy = ctx.macro('dxy');
    const ndx = ctx.macro('ndx');
    ctx.log('i=' + ctx.i + ' dxy=' + dxy + ' ndx=' + ndx);
    st.nextLog = ctx.i + 250;
  }

  if (pos > 0) {
    if (price > ema20) {
      st.cooldown = ctx.i + 2;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (st.cooldown != null && ctx.i < st.cooldown) return null;

  if (price > sma200 && price <= lower && rsi < 40) {
    st.cooldown = null;
    const riskEq = 0.015 * ctx.cash;
    const qty = riskEq / atr;
    const maxQty = ctx.cash / price * 0.9;
    return { side: 'buy', qty: Math.min(qty, maxQty) };
  }
  return null;
}
