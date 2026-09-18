/*
 * @coinsori-strategy v1
 * name: Price Momentum Breakout 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Buys when price breaks above a tight consolidation (range width < 1.5% of price)
 * with above-average volume confirming the move. Sells on trailing ATR stop.
 * This bets on explosive moves after quiet periods — the market "coils" before it moves.
 * When it sells: trailing ATR stop locks in gains after a breakout move stalls.
 * When it does NOT work: choppy markets with no clear trend — whipsaws produce small losses.
 */

function onUpdate(ctx) {
  // ── ATR for stop ──────────────────────────────────────────────
  const atr = ctx.atr(14);
  if (atr == null) return null;

  // ── Range width (high - low) over last 20 bars ───────────────
  // ago=1 reads the last closed bar; ago=20 reads 20 bars ago
  const rangeH = ctx.high(20);   // highest high in last 20 bars
  const rangeL = ctx.low(20);    // lowest low  in last 20 bars
  if (rangeH == null || rangeL == null) return null;

  const rangeWidth  = rangeH - rangeL;
  const rangePct    = rangeWidth / ctx.price;  // fraction of current price

  // ── Volume confirmation ───────────────────────────────────────
  const avgVol = ctx.avgVol(20);
  const volNow = ctx.vol;        // current bar volume
  if (avgVol == null || volNow == null) return null;
  const volRatio = volNow / avgVol;

  // ── Entry: tight range + volume surge + price at top of range ─
  // Price must be within 10% of the 20-bar high (confirming the breakout direction)
  const nearHigh = (ctx.price >= rangeH * 0.90);

  // Long entry: range is tight (< 1.5% of price) + volume surge (1.5× avg) + near high
  if (!ctx.position && rangePct < 0.015 && volRatio > 1.5 && nearHigh) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // ── Exit: trailing ATR stop ────────────────────────────────────
  if (ctx.position > 0) {
    const trailPx = ctx.price - 2.0 * atr;  // 2× ATR trailing buffer
    // Stop out if price drops to entry minus 1.5× ATR (initial risk)
    const riskAmt  = ctx.price * 0.015;      // 1.5% of entry price
    const stopPx   = ctx.entryPx - riskAmt;
    // Use whichever is higher: stopPx (hard stop) or trailPx (trailing)
    const exitPx   = Math.max(stopPx, trailPx);
    return { side: 'sell', qty: ctx.position, type: 'limit', price: exitPx };
  }

  return null;
}
