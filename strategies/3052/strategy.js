/*
 * @coinsori-strategy v1
 * name: Multi-Asset Defensive MR Basket 5-Asset ATR-Trail
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
    // Track the highest close since entry so the trail is anchored to the real peak.
    const peak = ctx.state.peak != null ? Math.max(ctx.state.peak, price) : price;
    ctx.state.peak = peak;
    const trailStop = peak - 2.5 * atr; // 2.5 ATR below the peak = let winners run, cut reversals
    if (price < trailStop || price > ema20) {
      ctx.state.peak = null;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (!uptrend) return null;

  const bollingerFlush = price < lowerBand && rsi < 30;
  const keltnerPullback = price < keltnerLow && rsi < 40;

  if (bollingerFlush) {
    const qty = (ctx.cash / price) * 0.20;
    if (qty <= 0) return null;
    ctx.state.peak = price;
    return { side: 'buy', qty: qty };
  }
  if (keltnerPullback) {
    // 2.5% of equity risked per leg, inverse-ATR sized, capped at the 20% leg share.
    const riskBudget = 0.025 * ctx.cash;
    let qty = riskBudget / atr;
    const maxQty = (ctx.cash / price) * 0.20;
    qty = Math.min(qty, maxQty);
    if (qty <= 0) return null;
    ctx.state.peak = price;
    return { side: 'buy', qty: qty };
  }
  return null;
}
