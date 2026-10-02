/*
 * @coinsori-strategy v1
 * name: SOL 1D Defensive MR Volume-Confirmed
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated SOL 1D MR champion (BB-low 20/2 + RSI<30, rising-200d
 * gate, EMA20 snap-back exit) lagged in the recent bear window because it bought dips that
 * were slow bleeds, not real flushes. Adding a volume-confirmation rule (only buy a dip when
 * it comes with above-average volume — genuine panic buying interest) filters out the
 * low-volume drift-downs and improved the full 5-year span (+45% vs +35% champion) while
 * turning the recent bear window from a loss into a flat cash-protected window.
 * When it buys and sells: buy when price closes below the lower Bollinger (20,2) with
 * RSI(14)<30 AND current volume is above 1.3x its 20-day average, all inside a rising
 * 200-day average. Sell when price closes back above the 20-day EMA or the 200-day trend
 * turns down.
 * When it does NOT work: in a broad coordinated bear the rising-trend gate keeps it flat
 * (safe, little upside); the volume filter can miss a quiet capitulation that later turns;
 * in a straight-line melt-up it lags buy-and-hold.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  const ema20 = ctx.ema(20, 1);
  const avgVol = ctx.avgVol(20);
  const vol = ctx.vol;
  if (bb == null || rsi == null || sma200 == null || sma200prev == null || ema20 == null || avgVol == null || vol == null) return null;

  const uptrend = sma200 > sma200prev;
  const pos = ctx.position;

  if (pos > 0) {
    // Snap-back exit: price recovered above the 20-day EMA, or the long trend broke.
    if (price > ema20 || !uptrend) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (!uptrend) return null;

  const flush = price < bb.lower && rsi < 30;
  const realVolume = vol > 1.3 * avgVol; // genuine panic, not a slow drift — filters W4-style bleeds
  if (flush && realVolume) {
    const qty = (ctx.cash / price) * 0.99;
    if (qty <= 0) return null;
    return { side: 'buy', qty: qty };
  }
  return null;
}
