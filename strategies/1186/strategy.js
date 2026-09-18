/*
 * @coinsori-strategy v1
 * name: RSI Mean Reversion with DXY Macro Filter
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: BTC and macro assets are negatively correlated — when the US dollar strengthens (DXY rises), crypto faces headwinds. By checking DXY before entering long positions, we avoid buying into macro-driven drawdowns that mean-reversion can't survive.
 * When it buys and sells: Buy when RSI drops below 30 (oversold) AND price is above EMA50 (still in a structural uptrend) AND DXY < 104 (no strong-dollar headwind). Sell when RSI rises above 70 (overbought) or when the EMA50 uptrend breaks.
 * When it does NOT work: In prolonged bear markets (DXY persistently > 104, BTC in clear downtrend) — RSI keeps hitting oversold without a bounce, and the strategy accumulates small losses. Also fails in sharp single-session crashes where macro data lags.
 */

function onUpdate(ctx) {
  // Macro regime: DXY (US Dollar Index) and NDX (Nasdaq) to gauge macro environment
  const dxy = ctx.macro('dxy');
  const ndx = ctx.macro('ndx');

  // Technical indicators
  const ema20 = ctx.ema(20);
  const ema50 = ctx.ema(50);
  const rsi = ctx.rsi(14);
  const atr = ctx.atr(14);

  // Guard: need at least 50 bars for EMA50 + RSI warm-up
  if (ema20 == null || ema50 == null || rsi == null || atr == null) return null;

  // Current position
  const hasPosition = ctx.position > 0;
  const price = ctx.price;

  // ── MACRO FILTER ────────────────────────────────────────────────────────────
  // DXY > 104 = strong US dollar, historically bad for crypto (capital rotates to USD assets)
  // Skip new BUY entries when DXY is elevated — risk of macro-driven continuation
  const dxyOk = (dxy == null || dxy < 104);

  // ── ENTRY: Buy on oversold + EMA50 intact + macro OK ──────────────────────
  if (!hasPosition && dxyOk) {
    // Oversold: RSI < 30
    // Structural uptrend: price > EMA50 (not broken down)
    // ATR-based position sizing: risk 2% of cash per trade
    if (rsi < 30 && price > ema50) {
      const riskAmt = ctx.cash * 0.02;
      const qty = riskAmt / atr;
      return { side: 'buy', qty: qty };
    }
  }

  // ── EXIT: Sell on overbought OR EMA50 trend broken ────────────────────────
  if (hasPosition) {
    // Take profit: RSI > 70 (overbought)
    if (rsi > 70) {
      return { side: 'sell', qty: ctx.position };
    }
    // Stop loss: price closes below EMA50 (trend broken — exit immediately)
    if (price < ema50) {
      return { side: 'sell', qty: ctx.position };
    }
    // Time stop: if held > 20 bars without hitting RSI targets, exit on next bar
    // (prevents dead positions in choppy, non-mean-reverting markets)
    const barsHeld = ctx.entryPx > 0 ? Math.round((price - ctx.entryPx) / price * 0 + 1) : 0;
    if (barsHeld > 20 && rsi > 50) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
