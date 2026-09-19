/*
 * @coinsori-strategy v1
 * name: Multi-EMA Trend + RSI Filter — BTCUSDT 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Pure SMA(20,50) crossover (strategy 1241) beat the
 * market 2/3 windows but had large MDD in the oldest window. Adding a RSI
 * filter — only entering when RSI is in the 40-70 zone — avoids entries
 * at the tail end of moves when momentum is already exhausted. The fast
 * EMA(9) confirms the crossover faster than SMA(20), catching more of
 * the trend while the slow EMA(50) filters noise.
 *
 * When it buys: EMA(9) crosses above EMA(50) (golden cross) AND price is
 * above EMA(200) (broad uptrend) AND RSI(14) is between 40 and 70 (not
 * exhausted). Volume confirmation optional.
 *
 * When it sells: EMA(9) crosses below EMA(50) (death cross) OR +8%
 * take-profit OR RSI hits 80 (overbought warning).
 *
 * When it does NOT work: In slow grinding uptrends, the RSI 40-70 filter
 * may prevent entries (it waits for pullbacks). In sharp V-shaped reversals
 * the EMA(50) filter is too slow to react.
 */
function onUpdate(ctx) {
  // ── 1. EMAs ─────────────────────────────────────────────────────────────
  const ema9  = ctx.ema(9);
  const ema50 = ctx.ema(50);
  const ema200 = ctx.ema(200);
  if (ema9 == null || ema50 == null || ema200 == null) return null;

  // Previous bar EMAs for crossover detection
  const ema9P  = ctx.ema(9, 1);
  const ema50P = ctx.ema(50, 1);
  if (ema9P == null || ema50P == null) return null;

  // ── 2. RSI(14) ──────────────────────────────────────────────────────────
  const rsi = ctx.rsi(14);
  if (rsi == null) return null;

  // ── 3. Volume ─────────────────────────────────────────────────────────────
  const avgVol = ctx.avgVol(20);
  if (avgVol == null) return null;
  const volConfirm = ctx.vol > avgVol;

  // ── 4. State ─────────────────────────────────────────────────────────────
  const price    = ctx.price;
  const position = ctx.position;

  // ── 5. Entry: EMA golden cross + broad trend + RSI zone + volume ─────────
  if (!position) {
    const crossUp      = ema9P <= ema50P && ema9 > ema50;
    const broadUptrend = price > ema200;  // broad EMA(200) uptrend
    // RSI 40-70: not oversold, not overbought — avoids entries on exhausted moves
    const rsiZone      = rsi > 40 && rsi < 70;

    if (crossUp && broadUptrend && rsiZone && volConfirm) {
      return { side: 'buy', qty: ctx.cash / price * 0.99, type: 'market' };
    }
  }

  // ── 6. Exit: EMA death cross OR take-profit OR RSI overbought ─────────────
  if (position) {
    const crossDown  = ema9P >= ema50P && ema9 < ema50;
    const rsiHot     = rsi > 80;           // overbought warning
    const pnlPct     = (price - ctx.entryPx) / ctx.entryPx;
    const takeProfit = pnlPct >= 0.08;     // +8% take-profit

    if (crossDown || rsiHot || takeProfit) {
      return { side: 'sell', qty: position, type: 'market' };
    }
  }

  return null;
}
