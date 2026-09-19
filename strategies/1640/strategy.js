/*
 * @coinsori-strategy v1
 * name: ETH EMA200 Regime + RSI Oversold 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: DXY macro filter on 1H failed (zero trades) because
 * DXY is a daily signal — it barely changes on hourly bars and acts as a
 * static block. EMA200 on 4H = ~33 days of trend, matching a proper regime
 * window. ETHUSDT is more volatile than BTC, giving bigger RSI oversold
 * bounces. Different symbol + correct timeframe for the regime filter.
 * When it buys and sells: Long when price > EMA200 AND RSI crosses above 30
 * from oversold. Short when price < EMA200 AND RSI crosses below 70 from
 * overbought. Regime-aligned only — no counter-trend trades.
 * When it does NOT work: When ETH chops around EMA200 with no clear trend
 * (whipsaw city). Also fails in late-stage bear bottoms where price stays
 * below EMA200 but bounces hard — the regime filter blocks the best entries.
 */
function onUpdate(ctx) {
  const rsi  = ctx.rsi(14);
  const rsiP = ctx.rsi(14, 1);
  if (rsi == null || rsiP == null) return null;

  const atr   = ctx.atr(14);
  if (atr == null) return null;

  const ema200 = ctx.ema(200);
  if (ema200 == null) return null;

  const price   = ctx.price;
  const pos     = ctx.position || 0;
  const entryPx = ctx.entryPx  || price;

  // === CLOSE LONG ===
  if (pos > 0) {
    // Exit when momentum fades: RSI drops below 45
    if (rsi < 45) return { side: 'sell', qty: pos };
    // Hard ATR stop
    if (price < entryPx - 2.5 * atr) return { side: 'sell', qty: pos };
    return null;
  }

  // === CLOSE SHORT ===
  if (pos < 0) {
    // Exit when RSI recovers above 55
    if (rsi > 55) return { side: 'buy', qty: Math.abs(pos) };
    // Hard ATR stop
    if (price > entryPx + 2.5 * atr) return { side: 'buy', qty: Math.abs(pos) };
    return null;
  }

  // === REGIME-ALIGNED ENTRY ===
  // Long: price above EMA200 (bull regime) + RSI oversold bounce
  if (price > ema200 && rsiP <= 30 && rsi > 30) {
    return { side: 'buy', qty: ctx.cash / price * 0.98 };
  }

  // Short: price below EMA200 (bear regime) + RSI overbought dump
  if (price < ema200 && rsiP >= 70 && rsi < 70) {
    return { side: 'sell', qty: ctx.cash / price * 0.98 };
  }

  return null;
}
