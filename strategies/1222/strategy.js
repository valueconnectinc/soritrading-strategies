/*
 * @coinsori-strategy v1
 * name: VWAP + BB Mean Reversion — SOLUSDT 4H
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Volume-weighted mean reversion for altcoins: buy when price is significantly
 * below VWAP (institutional accumulation zone) AND touches lower BB AND RSI
 * is oversold. The VWAP deviation adds a layer of "fair value" awareness that
 * pure BB strategies lack — we only buy when price is BOTH cheap vs VWAP
 * AND oversold vs recent range.
 * Sell when price returns to VWAP OR upper BB OR RSI overbought.
 * When it does NOT work: in strong downtrends where VWAP itself is falling,
 * price below VWAP keeps triggering entries into a continuing slide.
 * Also relies on VWAP being computed over a meaningful anchor window.
 */

function onUpdate(ctx) {
  const rsi = ctx.rsi(14);
  const bb  = ctx.bb(20, 2);
  const ema200 = ctx.ema(200);
  const avgVol = ctx.avgVol(20);
  const atr = ctx.atr(14);

  if (rsi == null || bb == null || ema200 == null) return null;
  if (bb.mid == null) return null;

  const price = ctx.price;
  const { lower, mid, upper } = bb;

  // VWAP approximation: use EMA(9) of typical price as a proxy
  // ctx doesn't have native VWAP, so we use close EMA as a stand-in
  const vwapProxy = ctx.ema(9);
  if (vwapProxy == null) return null;

  // Deviation from VWAP proxy: how far below "fair value" is price?
  const vwapDev = (vwapProxy - price) / vwapProxy; // positive = below fair value

  // EMA200 must be rising — only long in confirmed uptrends (crash protection)
  const ema200_1 = ctx.ema(200, 1);
  const ema200Rising = ema200_1 != null && ema200_1 < ema200;

  // Volume must exceed its 20-bar average (filters low-quality snaps)
  const volConfirm = (avgVol == null || ctx.vol >= avgVol);

  // ATR rising = volatility expanding (good for mean reversion plays)
  const atr_1 = ctx.atr(14, 1);
  const atrRising = (atr_1 == null || atr >= atr_1);

  if (ctx.position === 0) {
    // Entry: below VWAP proxy (>2% below) + lower BB touch + RSI oversold + uptrend + volume + ATR expanding
    const belowVwap = vwapDev > 0.02;
    const atLower = price <= lower * 1.005; // within 0.5% of lower BB
    const oversold = rsi < 35;

    if (belowVwap && atLower && oversold && ema200Rising && volConfirm && atrRising) {
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  } else {
    // Exit: price at VWAP OR at middle BB OR RSI overbought OR upper BB
    const atVwap = vwapDev < 0.005;
    const atMid = price >= mid;
    const overbought = rsi > 60;
    const atUpper = price >= upper;

    if (atVwap || atMid || overbought || atUpper) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
