/*
 * @coinsori-strategy v1
 * name: Bollinger Band Mean Reversion v2 — BTCUSDT 1H
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Tighter mean-reversion: BTC bounces off the lower BB in ranging markets.
 * Buy when price pierces >1% below the lower band AND RSI < 30 (stronger
 * oversold signal, fewer whipsaws). Sell at middle band or RSI > 60.
 * Only trade with the trend (SMA20 > SMA50) to avoid counter-trend entries.
 * Works in ranging and moderate-trend markets. Fails in strong sustained
 * drops where the band itself keeps falling — "catching a falling knife."
 */
function onUpdate(ctx) {
  const position = ctx.position;
  const price    = ctx.price;

  // === BOLLINGER BANDS (20, 2) ===
  const bb = ctx.bb(20, 2);
  if (bb == null) return null;
  const lower = bb.lower;
  const mid   = bb.mid;

  // === RSI(14) ===
  const rsi = ctx.rsi(14);
  if (rsi == null) return null;

  // === TREND FILTER: SMA20 > SMA50 (avoid counter-trend entries) ===
  const sma20 = ctx.sma(20);
  const sma50 = ctx.sma(50);
  if (sma20 == null || sma50 == null) return null;
  const withTrend = sma20 > sma50;

  // === ENTRY: price pierces >1% below lower band + RSI < 30 + with trend ===
  if (!position) {
    const pierceLower = price < lower * 0.99; // price is >1% below lower band
    const rsiOversold = rsi < 30;             // stricter than v1 (was 35)

    if (pierceLower && rsiOversold && withTrend) {
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  // === EXIT: price reaches middle band OR RSI > 60 ===
  if (position) {
    const reachMid        = price >= mid;
    const rsiOverbought   = rsi > 60;

    if (reachMid || rsiOverbought) {
      return { side: 'sell', qty: position };
    }
  }

  return null;
}
