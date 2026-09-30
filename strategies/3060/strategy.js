/*
 * @coinsori-strategy v1
 * name: Multi-Asset Defensive MR Basket 5-Asset 4H Low-Churn
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, BNBUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The 1d 7-asset MR champion is at a strong optimum. Its 4h sibling
 * (3060) showed the same defensive edge with even lower drawdown (4.95% on the middle
 * window) but traded 567+ times, so fees ate the return. This version cuts trade
 * frequency with a per-asset cooldown and a deeper entry threshold, keeping the
 * low-drawdown mean-reversion edge while reducing fee drag.
 * When it buys and sells: On each asset, buy when price closes below the lower Bollinger
 * (20,2.5) with RSI<25 (deeper than before), or below the ATR-adaptive Keltner low with
 * RSI<35, only inside a rising 200-bar average, and only if that asset has not traded in
 * the last 6 bars (cooldown). Sell via an ATR-trail (2.5 ATR below peak) or when price
 * closes back above the 20-bar EMA.
 * When it does NOT work: The cooldown and deeper thresholds mean it misses shallow,
 * quickly-recovering flushes. In a straight-line bull it still lags buy-and-hold of any
 * single asset. 4h whipsaws can still erode the edge in sustained chop.
 */
function onUpdate(ctx) {
  const sym = ctx.sym;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const bb = ctx.bb(20, 2.5, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  if (bb == null || rsi == null || sma200 == null || sma200prev == null || ema20 == null || atr == null || atr <= 0) return null;

  const uptrend = sma200 > sma200prev;
  const lowerBand = bb.lower;
  const keltnerLow = ema20 - 2.5 * atr;

  const pos = ctx.pos(sym);
  if (pos > 0) {
    const peak = ctx.state.peak != null ? Math.max(ctx.state.peak, price) : price;
    ctx.state.peak = peak;
    const trailStop = peak - 2.5 * atr;
    if (price < trailStop || price > ema20) {
      ctx.state.peak = null;
      ctx.state.cooldown = ctx.i; // set cooldown timestamp on exit
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Cooldown: skip new entries for 6 bars after an exit on this asset (cuts churn).
  if (ctx.state.cooldown != null && ctx.i - ctx.state.cooldown < 6) return null;

  if (!uptrend) return null;

  // Deeper thresholds than the 4h v1 (RSI<25 / <35 vs <30 / <40) to trade less often.
  const bollingerFlush = price < lowerBand && rsi < 25;
  const keltnerPullback = price < keltnerLow && rsi < 35;

  if (bollingerFlush) {
    const qty = (ctx.cash / price) * 0.20;
    if (qty <= 0) return null;
    ctx.state.peak = price;
    ctx.state.cooldown = null;
    return { side: 'buy', qty: qty };
  }
  if (keltnerPullback) {
    const riskBudget = 0.025 * ctx.cash;
    let qty = riskBudget / atr;
    const maxQty = (ctx.cash / price) * 0.20;
    qty = Math.min(qty, maxQty);
    if (qty <= 0) return null;
    ctx.state.peak = price;
    ctx.state.cooldown = null;
    return { side: 'buy', qty: qty };
  }
  return null;
}
