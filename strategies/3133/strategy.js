/*
 * @coinsori-strategy v1
 * name: Multi-Asset Defensive MR Basket 5-Asset ATR-Trail (watch)
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, BNBUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The 5-asset defensive MR basket is the validated champion, but its
 * fixed EMA20/RSI55 snap-back exit cuts winners before a full recovery. The ledger showed
 * that an ATR-trailing stop (2.5 ATR below the highest close since entry) cuts drawdown by
 * more than half while raising return on the same basket. Each leg runs the champion recipe
 * independently, sized to a share of equity.
 * When it buys and sells: On each asset, buy when price closes below the lower Bollinger
 * (20,2.5) with RSI<30, or below the ATR-adaptive Keltner low (EMA20-2.5*ATR) with RSI<40,
 * only inside a rising 200-day average. Sell via an ATR-trailing stop (2.5 ATR below the
 * highest close since entry) or when price closes back above the 20-day EMA.
 * When it does NOT work: In a broad coordinated crypto bear all rising-trend gates stay
 * flat (capital safe, little upside); a single straight-line melt-up of one asset still
 * lags buy-and-hold of that asset. The trail can whipsaw an early volatile recovery.
 *
 * Changes vs. the previous version (2026-10-04):
 *  1. ctx.watch — every tick declares, for THIS symbol, the prices it is waiting for. The live/paper
 *     chart draws them as dashed lines with an estimated "~5m-20m" range; the run card lists them.
 *     Price lines are necessary, not sufficient: the RSI condition is in the note.
 *  2. Peak per symbol. ctx.state is ONE object for the whole run (all 5 symbols share it), so the old
 *     `ctx.state.peak` let one symbol's high drive another symbol's trailing stop. Now ctx.state.peak[sym].
 *  Trading decisions are otherwise unchanged — re-run the backtest anyway (the peak fix changes exits).
 */
 
// Declare watch lines for this symbol's tick. Agents before 1.229 have no ctx.watch — skip quietly there.
function declare(ctx, list) {
  if (typeof ctx.watch === 'function') ctx.watch(list);
}
 
function onUpdate(ctx) {
  const sym = ctx.sym;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) { declare(ctx, []); return null; }
 
  const bb = ctx.bb(20, 2.5, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  if (bb == null || rsi == null || sma200 == null || sma200prev == null || ema20 == null || atr == null || atr <= 0) {
    declare(ctx, []);   // warming up: nothing to wait for yet (not "unsupported")
    return null;
  }
 
  const uptrend = sma200 > sma200prev;
  const lowerBand = bb.lower;
  const keltnerLow = ema20 - 2.5 * atr;
 
  if (!ctx.state.peak || typeof ctx.state.peak !== 'object') ctx.state.peak = {};   // per-symbol peaks (see header §2)
  const peaks = ctx.state.peak;
 
  const pos = ctx.pos(sym);
  if (pos > 0) {
    // Track the highest close since entry so the trail is anchored to THIS symbol's real peak.
    const peak = peaks[sym] != null ? Math.max(peaks[sym], price) : price;
    peaks[sym] = peak;
    const trailStop = peak - 2.5 * atr; // 2.5 ATR below the peak = let winners run, cut reversals
    if (price < trailStop || price > ema20) {
      delete peaks[sym];
      declare(ctx, []);
      return { side: 'sell', qty: pos };
    }
    // Two exits are armed: the trail below and the EMA20 snap-back above.
    declare(ctx, [
      { side: 'sell', price: trailStop, qty: pos, note: '트레일 스탑 — 고점 −2.5 ATR' },
      { side: 'sell', price: ema20, qty: pos, note: 'EMA20 복귀 — 반등 청산' },
    ]);
    return null;
  }
 
  if (!uptrend) {
    declare(ctx, []);   // 200-day average falling: this symbol is not waiting for anything
    return null;
  }
 
  const bollingerFlush = price < lowerBand && rsi < 30;
  const keltnerPullback = price < keltnerLow && rsi < 40;
 
  if (bollingerFlush) {
    const qty = (ctx.cash / price) * 0.20;
    if (qty <= 0) { declare(ctx, []); return null; }
    peaks[sym] = price;
    declare(ctx, []);
    return { side: 'buy', qty: qty };
  }
  if (keltnerPullback) {
    // 2.5% of equity risked per leg, inverse-ATR sized, capped at the 20% leg share.
    const riskBudget = 0.025 * ctx.cash;
    let qty = riskBudget / atr;
    const maxQty = (ctx.cash / price) * 0.20;
    qty = Math.min(qty, maxQty);
    if (qty <= 0) { declare(ctx, []); return null; }
    peaks[sym] = price;
    declare(ctx, []);
    return { side: 'buy', qty: qty };
  }
 
  // Flat inside an uptrend: both entry lines, with the size each would buy at that price.
  const wait = [];
  if (lowerBand > 0) {
    wait.push({ side: 'buy', price: lowerBand, qty: (ctx.cash / lowerBand) * 0.20,
      note: 'BB(20,2.5) 하단 + RSI<30 (지금 ' + rsi.toFixed(0) + ')' });
  }
  if (keltnerLow > 0) {
    wait.push({ side: 'buy', price: keltnerLow, qty: Math.min(0.025 * ctx.cash / atr, (ctx.cash / keltnerLow) * 0.20),
      note: '켈트너 하단 + RSI<40 (지금 ' + rsi.toFixed(0) + ')' });
  }
  declare(ctx, wait);
  return null;
}
