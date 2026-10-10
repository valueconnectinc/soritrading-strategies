/*
 * @coinsori-strategy v1
 * name: Multi-Asset MR Basket 4H (champion recipe)
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, BNBUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The validated champion recipe (defensive mean reversion on a
 * basket of 5 assets) ported to 4h. The ledger shows this family works on 4h —
 * buying local panics inside a rising long-term trend with small per-leg risk keeps
 * drawdown low while capturing snap-backs.
 * When it buys and sells: On each asset, buy when price closes below the lower
 * Bollinger (20, 2.5) with RSI<30, or below the Keltner low (EMA20 - 2.5*ATR) with
 * RSI<40, only when the 1200-bar average is rising (~200 days on 4h — the same
 * regime horizon the validated 1d champion uses). Sell via an ATR-trailing stop
 * (2.5 ATR below the highest close since entry) or when price closes back above the
 * 20-bar EMA. Each leg sized to 20% of equity, risk per leg capped.
 * When it does NOT work: In a broad decline spanning more than ~200 days the trend
 * gate stays off and the strategy sits in cash (safe but no upside); a single
 * straight-line melt-up lags buy-and-hold. The trail can whipsaw an early recovery.
 */
function onUpdate(ctx) {
  const sym = ctx.sym;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) { ctx.watch([]); return null; }

  const bb = ctx.bb(20, 2.5, 1);
  const rsi = ctx.rsi(14, 1);
  const sma1200 = ctx.sma(1200, 1);
  const sma1200prev = ctx.sma(1200, 2);
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  if (bb == null || rsi == null || sma1200 == null || sma1200prev == null || ema20 == null || atr == null || atr <= 0) {
    ctx.watch([]);
    return null;
  }

  const uptrend = sma1200 > sma1200prev;
  const lowerBand = bb.lower;
  const keltnerLow = ema20 - 2.5 * atr;

  if (!ctx.state.peak || typeof ctx.state.peak !== 'object') ctx.state.peak = {};
  const peaks = ctx.state.peak;

  const pos = ctx.pos(sym);
  if (pos > 0) {
    const peak = peaks[sym] != null ? Math.max(peaks[sym], price) : price;
    peaks[sym] = peak;
    const trailStop = peak - 2.5 * atr;
    if (price < trailStop || price > ema20) {
      delete peaks[sym];
      ctx.watch([]);
      return { side: 'sell', qty: pos };
    }
    ctx.watch([
      { side: 'sell', price: trailStop, trigger: 'below', qty: pos, note: 'trail stop' },
      { side: 'sell', price: ema20, trigger: 'above', qty: pos, note: 'EMA20 snap-back' }
    ]);
    return null;
  }

  const bollingerFlush = uptrend && price < lowerBand && rsi < 30;
  const keltnerPullback = uptrend && price < keltnerLow && rsi < 40;

  if (bollingerFlush) {
    const qty = (ctx.cash / price) * 0.20;
    if (qty <= 0) { ctx.watch([]); return null; }
    peaks[sym] = price;
    ctx.watch([]);
    return { side: 'buy', qty: qty };
  }
  if (keltnerPullback) {
    // 2.5% of equity risked per leg, inverse-ATR sized, capped at the 20% leg share.
    const riskBudget = 0.025 * ctx.cash;
    let qty = riskBudget / atr;
    const maxQty = (ctx.cash / price) * 0.20;
    qty = Math.min(qty, maxQty);
    if (qty <= 0) { ctx.watch([]); return null; }
    peaks[sym] = price;
    ctx.watch([]);
    return { side: 'buy', qty: qty };
  }

  const slopePct = (sma1200 / sma1200prev - 1) * 100;
  const trendCond = { label: '1200-bar slope %', now: slopePct, op: '>', ref: 0, closed: true };
  const wait = [];
  if (lowerBand > 0) {
    wait.push({ side: 'buy', price: lowerBand, trigger: 'below', qty: (ctx.cash / lowerBand) * 0.20,
      note: 'BB(20,2.5) lower', conds: [{ label: 'RSI(14) close', now: rsi, op: '<', ref: 30, closed: true }, trendCond] });
  }
  if (keltnerLow > 0) {
    wait.push({ side: 'buy', price: keltnerLow, trigger: 'below', qty: Math.min(0.025 * ctx.cash / atr, (ctx.cash / keltnerLow) * 0.20),
      note: 'Keltner low', conds: [{ label: 'RSI(14) close', now: rsi, op: '<', ref: 40, closed: true }, trendCond] });
  }
  ctx.watch(wait);
  return null;
}
