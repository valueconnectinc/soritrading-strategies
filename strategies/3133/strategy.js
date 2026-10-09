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
 *
 * Change (2026-10-09): ctx.watch lines carry `trigger` ('below' = price falls to it, 'above' = rises to it)
 *  so the run card can tell "met" correctly — the trail stop sits BELOW price and must not read as met.
 *  Display only: no trading decision changed (agent 1.273.0+ passes it through; older agents ignore it).
 *
 * Change (2026-10-10): each entry line also lists its NON-price conditions (`conds`) with the exact values
 *  this tick decided on — RSI(14) of the last CLOSED bar and the SMA200 slope. The run card now says
 *  "price reached, RSI still 36 — not buying yet" instead of implying the 109 line is about to fill.
 *  RSI is ago=1 (closed bar): it does not change until the next daily close — marked closed:true.
 *  Also: ctx.watch is called directly (no feature check — the platform checks agent support at deploy).
 *  Display only again: no trading decision changed.
 *
 * Change (2026-10-10, later): the 200-day trend is shown as its slope in % (it was a bare true), and the note
 *  names the band the line sits on ("BB(20,2.5) 하단(마감 봉)" — the band of the last closed bar). A symbol whose
 *  200-day average is falling now still declares its two lines with the trend chip ✗ (it used to declare
 *  nothing, so the card could not say why it was not waiting). Trading decisions are identical: the trend
 *  test moved into the two entry conditions instead of an early return.
 */

// Declare watch lines for this symbol's tick (display only — the return value of onUpdate is what trades).
function declare(ctx, list) {
  ctx.watch(list);
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
    // Two exits are armed: the trail below (fires when price FALLS to it) and the EMA20 snap-back above (fires when price RISES to it).
    declare(ctx, [
      { side: 'sell', price: trailStop, trigger: 'below', qty: pos, note: '트레일 스탑 — 고점 −2.5 ATR' },
      { side: 'sell', price: ema20, trigger: 'above', qty: pos, note: 'EMA20 복귀 — 반등 청산' },
    ]);
    return null;
  }

  //  Entries need ALL of: price below the band (live price vs. the band of the last CLOSED bar), RSI of the last
  //  closed bar below the threshold, and a rising 200-day average. Same decisions as before — only the order changed
  //  so a falling-trend symbol still DECLARES its lines (with the trend condition shown as ✗) instead of going silent.
  const bollingerFlush = uptrend && price < lowerBand && rsi < 30;
  const keltnerPullback = uptrend && price < keltnerLow && rsi < 40;

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

  // Flat: both entry lines (both fire when price FALLS to them), with the size each would buy at that price.
  //  The line's price IS the price part of the rule (the band of the last CLOSED bar — fixed until the daily close);
  //  conds = the other parts, with the values THIS tick decided on, so the card shows which part is missing.
  const slopePct = (sma200 / sma200prev - 1) * 100;   // closed bars (ago=1 vs ago=2) — changes only at the daily close
  const trendCond = { label: '200일선 기울기 %', now: slopePct, op: '>', ref: 0, closed: true };
  const wait = [];
  if (lowerBand > 0) {
    wait.push({ side: 'buy', price: lowerBand, trigger: 'below', qty: (ctx.cash / lowerBand) * 0.20,
      note: 'BB(20,2.5) 하단(마감 봉)',
      conds: [{ label: 'RSI(14) 마감', now: rsi, op: '<', ref: 30, closed: true }, trendCond] });
  }
  if (keltnerLow > 0) {
    wait.push({ side: 'buy', price: keltnerLow, trigger: 'below', qty: Math.min(0.025 * ctx.cash / atr, (ctx.cash / keltnerLow) * 0.20),
      note: '켈트너 하단(마감 봉)',
      conds: [{ label: 'RSI(14) 마감', now: rsi, op: '<', ref: 40, closed: true }, trendCond] });
  }
  declare(ctx, wait);
  return null;
}
