/*
 * @coinsori-strategy v1
 * name: MACD Momentum Breakout
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Momentum strategies catch trends that mean-reversion misses.
 * When MACD crosses above its signal line, short-term momentum has shifted bullish —
 * combined with EMA slope confirming the market is not ranging, this filters out whipsaws
 * in choppy conditions. This is the opposite bet from mean reversion (Exp 272/288).
 * When it buys and sells: Buy when MACD crosses above signal AND EMA9 above EMA21 (trend up).
 * Sell when MACD crosses below signal OR EMA9 drops below EMA21 (trend weakening).
 * When it does NOT work: In tight ranges EMA9 and EMA21 cross often and all signals are whipsaws;
 * in sharp reversals MACD crosses AFTER the move has already happened.
 */

function onUpdate(ctx) {
  // ── Indicators ──────────────────────────────────────────────────────────────
  const macd  = ctx.macd(12, 26, 9);
  const atr   = ctx.atr(14);
  const ema9  = ctx.ema(9);
  const ema21 = ctx.ema(21);
  const ema50 = ctx.ema(50);

  // Warm-up guard
  if (macd == null || atr == null || ema9 == null || ema21 == null || ema50 == null) return null;

  const pos  = ctx.position;
  const px   = ctx.price;

  // ── EMA slope proxy for trend strength (closed bars = stable) ───────────────
  const ema9_2  = ctx.ema(9,  2);
  const ema21_2 = ctx.ema(21, 2);
  const ema50_2 = ctx.ema(50, 2);
  if (ema9_2 == null || ema21_2 == null || ema50_2 == null) return null;

  // Trend is UP when ema9 > ema21 and ema50 is rising (ema50 > ema50_2)
  const trendUp   = ema9 > ema21 && ema50 > ema50_2;
  // Trend is DOWN when ema9 < ema21 and ema50 is falling
  const trendDown = ema9 < ema21 && ema50 < ema50_2;
  // Trend strength: separation of ema9 and ema21 relative to ema21
  const emaSep = Math.abs(ema9 - ema21) / ema21;
  const strongTrend = emaSep > 0.01; // 1% separation = non-ranging

  // ── MACD crossover on closed bars (stable, not repainting) ───────────────────
  // Bar 1 = previous closed bar, Bar 2 = two bars ago
  const macd1 = ctx.macd(12, 26, 9, 1);
  const macd2 = ctx.macd(12, 26, 9, 2);
  const sig2  = ctx.macd(12, 26, 9, 3);
  if (macd1 == null || macd2 == null || sig2 == null) return null;

  // Bull cross: bar 2 MACD <= bar 2 signal AND bar 1 MACD > bar 1 signal
  const bullCross = macd1.macd > macd1.signal && macd2.macd <= macd2.signal;
  // Bear cross: bar 2 MACD >= bar 2 signal AND bar 1 MACD < bar 1 signal
  const bearCross = macd1.macd < macd1.signal && macd2.macd >= macd2.signal;

  // ── Entry: Long ─────────────────────────────────────────────────────────────
  if (pos === 0) {
    // MACD bullish cross + trend is up + strong enough separation
    if (bullCross && trendUp && strongTrend) {
      const qty = ctx.cash / px * 0.95;
      return { side: 'buy', qty, type: 'limit', price: px };
    }
  }

  // ── Exit: Long ──────────────────────────────────────────────────────────────
  if (pos > 0) {
    // Bear cross = momentum has flipped
    if (bearCross) {
      return { side: 'sell', qty: pos };
    }
    // Trend reversed (ema9 now below ema21)
    if (ema9 < ema21) {
      return { side: 'sell', qty: pos };
    }
    // Stop loss: 2.5× ATR below entry
    const entryPx = ctx.entryPx;
    if (entryPx != null) {
      const slPx = entryPx - 2.5 * atr;
      if (px < slPx) {
        return { side: 'sell', qty: pos };
      }
    }
  }

  return null;
}
