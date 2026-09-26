/*
 * @coinsori-strategy v1
 * name: ROC Pullback Mean Reversion BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: After a sharp short-term selloff inside a longer bull
 * trend, prices tend to snap back (mean reversion). We bet on that snap-back
 * rather than on riding the trend.
 * When it buys and sells: buys when the 10-day rate-of-change is deeply
 * negative (a sharp pullback) while price stays above the 200-day average
 * (bull regime); sells when price recovers to the 20-day average or the
 * 200-day trend breaks, with a hard stop at 3x ATR.
 * When it does NOT work: in a sustained bear market price keeps falling after
 * the pullback (trend gate helps but not always); and in a slow bleed the
 * 200-SMA gate keeps it out of genuine bottoms, so it misses V-reversals.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  // Trend gate: only buy pullbacks inside a confirmed long-term uptrend.
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  const sma20 = ctx.sma(20, 1);
  if (sma20 == null) return null;

  // Rate of change over 10 bars (closed bars, ago>=1 semantics).
  const p10 = ctx.closes[ctx.closes.length - 11];
  if (p10 == null || p10 <= 0) return null;
  const roc10 = (price - p10) / p10 * 100;

  // ATR for the hard stop distance (3x is wide enough to avoid noise stops).
  const atr = ctx.atr(14, 1);
  if (atr == null) return null;

  const st = ctx.state;

  if (pos > 0) {
    // Exit on recovery, trend break, or hard stop.
    const stopPx = st.stopPx || (ctx.entryPx - 3 * atr);
    if (price <= stopPx || price < sma200) {
      ctx.state.stopPx = null;
      return { side: 'sell', qty: pos };
    }
    // Take profit when price climbs back to the 20-day average.
    if (price >= sma20) {
      ctx.state.stopPx = null;
      return { side: 'sell', qty: pos };
    }
    ctx.state.stopPx = stopPx;
    return null;
  }

  // Entry: sharp 10-day pullback (<= -8%) inside a bull regime.
  // 8% is a meaningful dip for BTC on 1D, not just noise.
  if (roc10 <= -8 && price > sma200) {
    ctx.state.stopPx = price - 3 * atr;
    return { side: 'buy', qty: ctx.cash / price * 0.5 };
  }
  return null;
}
