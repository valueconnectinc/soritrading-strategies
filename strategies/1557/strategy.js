/*
 * @coinsori-strategy v1
 * name: Bollinger Squeeze + Volume Surge
 * ex: binance
 * syms: LINKUSDT
 * interval: 4h
 * cash: 1000
 *
 * Why this strategy: Markets cycle between low-volatility squeeze (bands narrow) and
 * high-volatility expansion (bands widen). A squeeze often precedes a strong move.
 * This strategy catches the breakout after a volatility compression, betting that
 * volume confirms the direction.
 * When it buys and sells: Enters when Bollinger bandwidth drops below its 20-bar
 * average (squeeze) AND price closes above the 20-bar SMA (uptrend confirmation)
 * AND volume surges above 1.5× its 20-bar average. Sells on a trailing ATR stop.
 * When it does NOT work: In choppy markets where bands keep narrowing and widening
 * without directional conviction; or when volume surges without price follow-through.
 */

function onUpdate(ctx) {
  // ── Warm-up guard ──────────────────────────────────────────────────────────
  const s = ctx.sma(20);
  if (s == null) return null;

  // ── Bollinger Bands (20,2) ────────────────────────────────────────────────
  const bb = ctx.bb(20, 2);
  if (bb == null) return null;

  // Bandwidth = upper - lower (absolute measure of volatility)
  const bandwidth = bb.upper - bb.lower;
  const bandwidthSMA = ctx.sma(20, 1);   // 1 bar ago to avoid self-reference
  if (bandwidthSMA == null) return null;

  // ── Volume ────────────────────────────────────────────────────────────────
  const volSMA = ctx.avgVol(20);
  if (volSMA == null) return null;
  const volRatio = ctx.vol / volSMA;

  // ── Trend: price above/below SMA ──────────────────────────────────────────
  const price = ctx.price;
  const aboveSMA = price > s;

  // ── Entry: squeeze contraction + volume surge + uptrend ──────────────────
  // bandwidth below its own 20-bar average = squeeze
  const inSqueeze = bandwidth < bandwidthSMA;

  // volume surge: 1.5× average volume
  const volSurge = volRatio > 1.5;

  // Price must be above SMA for long entry (trend confirmation)
  const trendConfirm = aboveSMA;

  if (inSqueeze && volSurge && trendConfirm && ctx.position === 0) {
    // Market buy with 99% of cash
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // ── Exit: ATR trailing stop ───────────────────────────────────────────────
  const atr = ctx.atr(14);
  if (atr == null) return null;

  if (ctx.position > 0 && ctx.entryPx != null) {
    // Trail stop: entry - 2× ATR, recalculated each bar
    const trailStop = ctx.entryPx - 2 * atr;
    const pctFromEntry = (ctx.price - ctx.entryPx) / ctx.entryPx;

    // Take profit at +5% with ATR trail
    const takeProfit = ctx.entryPx * 1.05;

    if (price <= trailStop) {
      return { side: 'sell', qty: ctx.position };
    }
    if (price >= takeProfit) {
      // Move stop to breakeven
      const stopPx = ctx.entryPx * 0.998;  // tiny buffer for fees
      if (price <= stopPx) {
        return { side: 'sell', qty: ctx.position };
      }
    }
  }

  return null;
}
