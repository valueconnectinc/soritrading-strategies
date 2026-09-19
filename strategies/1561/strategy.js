/*
 * @coinsori-strategy v1
 * name: SMA Crossover + Volume + Wide ATR Take-Profit — BTCUSDT 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The original SMA(20,50) crossover (strategy 1241) beat
 * the market 2/3 windows with low MDD. The fast EMA(8,21) + ATR×4 version
 * (strategy 1560) also beat 3/3 windows but the tight ATR×4 take-profit
 * capped gains in the bull window (lost 29pp vs bench). This version uses
 * the original SMA(20,50) parameters with a wider ATR×6 take-profit — enough
 * to let winners run but still locks in gains before the trend reverses.
 * When it buys and sells: Same entry as 1241 (SMA golden cross + volume).
 * Exits on SMA death cross OR when price reaches entry + 6× ATR.
 * When it does NOT work: If the trend runs longer than 6× ATR (e.g., BTC
 * enters a months-long bull run), the take-profit exits too early and
 * misses the bulk of the move.
 */
function onUpdate(ctx) {
  const sma20 = ctx.sma(20);
  const sma50 = ctx.sma(50);
  if (sma20 == null || sma50 == null) return null;

  const sma20Prev = ctx.sma(20, 1);
  const sma50Prev = ctx.sma(50, 1);
  if (sma20Prev == null || sma50Prev == null) return null;

  const avgVol = ctx.avgVol(20);
  if (avgVol == null) return null;
  const volConfirm = ctx.vol > avgVol;

  const position = ctx.position;
  const price    = ctx.price;

  // ── ENTRY: SMA golden cross + volume confirm ─────────────────────────
  if (!position) {
    const crossUp = sma20Prev <= sma50Prev && sma20 > sma50;
    if (crossUp && volConfirm) {
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  // ── EXIT: SMA death cross OR ATR×6 take-profit ────────────────────────
  if (position) {
    const crossDown = sma20Prev >= sma50Prev && sma20 < sma50;

    const atr = ctx.atr(14);
    let takeProfit = false;
    if (atr != null && ctx.entryPx != null) {
      // Wider ATR×6 take-profit — less aggressive than ×4
      takeProfit = price >= ctx.entryPx + 6 * atr;
    }

    if (crossDown || takeProfit) {
      return { side: 'sell', qty: position };
    }
  }

  return null;
}
