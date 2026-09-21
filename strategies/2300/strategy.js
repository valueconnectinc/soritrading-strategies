/*
 * @coinsori-strategy v1
 * name: BTC DXY-Regime Trend Ride
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Macro-regime filter: crypto tends to rally when the US Dollar Index (DXY) is
 * weakening (liquidity/risk-on) and bleed when the dollar strengthens. This
 * strategy rides an EMA trend for BTC but only takes longs when the dollar is
 * NOT in a strengthening regime, so it avoids buying into dollar headwinds.
 * When it buys: BTC price is above its 50-EMA (uptrend) AND the DXY is below
 * its own rolling average (dollar not strengthening). When it sells: BTC drops
 * below its 20-EMA (trend breaks) or the dollar regime turns against us.
 * When it does NOT work: if DXY and BTC stop having an inverse relationship
 * (e.g. both rally on global risk-on, or BTC driven by crypto-specific news),
 * the DXY gate is just noise and adds whipsaw. It also misses strong BTC
 * rallies that happen while the dollar is firming. Trend-following on BTC 4h
 * has historically whipsawed in chop (ledger), so this relies on the DXY gate
 * adding real signal, not just extra trading.
 */
function onUpdate(ctx) {
  const ema20 = ctx.ema(20, 1);
  const ema50 = ctx.ema(50, 1);
  if (ema20 == null || ema50 == null) return null;
  const px = ctx.price;
  if (px == null) return null;
  const pos = ctx.position || 0;
  const entry = ctx.entryPx || 0;

  // ---- DXY regime: maintain a rolling average of the dollar index in state.
  // DXY is a scalar from ctx.macro; we smooth it ourselves over ~40 bars so we
  // only flip on a sustained dollar move, not intraday noise.
  const dxy = ctx.macro('dxy');
  let dxyAvg = ctx.state.dxyAvg;
  if (dxy == null) {
    // DXY unknown this bar: keep the last known regime (do not block/flip).
    dxyAvg = dxyAvg || null;
  } else {
    dxyAvg = dxyAvg == null ? dxy : dxyAvg * 0.975 + dxy * 0.025; // ~40-bar EMA
    ctx.state.dxyAvg = dxyAvg;
  }
  // If we have no DXY history at all, treat regime as neutral (allow trade).
  const dollarStrong = dxyAvg != null && dxy > dxyAvg;

  // ---- ENTRY: BTC uptrend + dollar not strengthening ----
  if (pos === 0) {
    if (px > ema50 && !dollarStrong) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    return null;
  }

  // ---- EXIT: trend breaks or dollar regime turns against us ----
  if (px < ema20 || dollarStrong) {
    return { side: 'sell', qty: pos };
  }

  // Hard stop: real breakdown, 10% below entry.
  if (entry > 0 && px < entry * 0.90) {
    return { side: 'sell', qty: pos };
  }

  return null;
}
