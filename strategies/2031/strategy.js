/*
 * @coinsori-strategy v1
 * name: Multi-Timeframe RSI Momentum
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Single-timeframe RSI signals suffer from noise — the
 * same RSI reading can mean very different things depending on whether the
 * daily trend agrees. This strategy layers a daily SMA50 trend filter over
 * a 4H RSI signal: it only buys when the daily trend is bullish AND the 4H
 * RSI pulls back to oversold, avoiding the classic trap of buying RSI oversold
 * in a downtrend that just keeps falling.
 * When it buys and sells: Buy when daily SMA50 is rising (price > SMA50)
 * AND 4H RSI crosses above 40 from below (momentum turning up from pullback).
 * Sell when 4H RSI reaches 60 or price drops below daily SMA50.
 * When it does NOT work: In choppy markets where price oscillates around the
 * daily SMA50, the strategy gets whipsawed — the daily filter doesn't
 * eliminate chop, it just delays entries and exits.
 */

function onUpdate(ctx) {
  // ── State: persist values across ticks (not just bars) ─────────────────────
  const s = ctx.state;

  // Detect new bar to update previous-bar snapshot
  if (s.lastBarI !== ctx.i) {
    s.prevRsi   = s.snapRsi   ?? null;
    s.prevClose = s.snapClose ?? null;
    s.lastBarI  = ctx.i;
  }

  // ── Indicators ──────────────────────────────────────────────────────────────
  const rsi4h  = ctx.rsi(14);       // 4H RSI — primary signal
  const sma50  = ctx.sma(50);       // Daily SMA50 — trend filter (uses 4H bars, so ~8.3 days)
  const px     = ctx.price;
  const prevC  = ctx.closes[1];
  const pos    = ctx.position;

  if (rsi4h == null || sma50 == null || prevC == null) return null;

  // Snapshot current bar values for next tick's prev comparison
  s.snapRsi   = rsi4h;
  s.snapClose = prevC;

  // ── Previous bar RSI (stable, from state) ───────────────────────────────────
  const prevRsi = s.prevRsi;

  // ── Trend filter: daily (4H bars) SMA50 rising ──────────────────────────────
  // Price above SMA50 = short-term uptrend
  const dailyBullish = prevC > sma50;

  // ── RSI pullback entry: 4H RSI crossed above 40 from below ──────────────────
  const rsiPullback = prevRsi != null && prevRsi < 40 && rsi4h >= 40;

  // ── Entry: Long ─────────────────────────────────────────────────────────────
  if (pos === 0) {
    if (dailyBullish && rsiPullback) {
      const qty = ctx.cash / px * 0.99;
      return { side: 'buy', qty, type: 'limit', price: px, postOnly: true };
    }
    return null;
  }

  // ── Long exit ───────────────────────────────────────────────────────────────
  if (pos > 0) {
    // Exit if RSI reaches overbought threshold
    if (rsi4h > 60) {
      return { side: 'sell', qty: pos };
    }
    // Exit if daily trend breaks (price drops below SMA50)
    if (prevC < sma50) {
      return { side: 'sell', qty: pos };
    }
    // Trailing stop: 3% below entry
    const entryPx = ctx.entryPx;
    if (entryPx != null && px < entryPx * 0.97) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  return null;
}
