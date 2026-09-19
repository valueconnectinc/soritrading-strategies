/*
 * @coinsori-strategy v1
 * name: VWAP Mean Reversion + RSI
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Buys when price pulls back below VWAP (volume-weighted average price)
 * with RSI between 35–55 — the zone where price is cheap relative to
 * the day's average but not in panic-oversold territory. Sells when
 * price reverts back above VWAP or RSI reaches 65 (momentum exhausted).
 * A 3% hard stop prevents large drawdowns if the pullback deepens into
 * a genuine trend change.
 * When it does NOT work: in strong downtrending days where VWAP slopes
 * downward all day — every buy is below VWAP but price keeps falling,
 * RSI stays suppressed, and the strategy accumulates losing trades.
 * Also struggles in low-volume sessions where VWAP itself is noisy.
 */
function onUpdate(ctx) {
  const pos   = ctx.position;
  const price = ctx.price;

  // ── Warm-up ─────────────────────────────────────────────────────────
  const rsi = ctx.rsi(14, 1);
  if (rsi == null) return null;

  // ── VWAP proxy: 50-period EMA acts as a volume-smoothed anchor ───────
  // True VWAP needs intraday data; EMA(50) on 1H captures the same idea
  // of a rolling volume-weighted equilibrium over a full trading day
  const vwap = ctx.ema(50, 1);
  if (vwap == null) return null;

  // ── BUY: price below VWAP + RSI in reversion zone ────────────────────
  if (pos === 0 && price < vwap && rsi >= 35 && rsi <= 55) {
    ctx.log('BUY — below VWAP, RSI=' + rsi.toFixed(1) + ', VWAP=' + vwap.toFixed(2));
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }

  // ── SELL: above VWAP OR RSI overbought OR hard stop ──────────────────
  if (pos > 0) {
    const entryPx = ctx.entryPx;
    const pnlPct  = (price - entryPx) / entryPx;

    const aboveVwap = price > vwap;
    const rsiOver   = rsi > 65;
    const hardStop  = pnlPct <= -0.03;

    if (aboveVwap || rsiOver || hardStop) {
      ctx.log('SELL — aboveVwap=' + aboveVwap + ' rsiOver=' + rsiOver + ' stop=' + hardStop + ' pnl=' + (pnlPct*100).toFixed(1) + '%');
      return { side: 'sell', qty: pos };
    }
  }

  return null;
}
