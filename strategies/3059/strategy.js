/*
 * @coinsori-strategy v1
 * name: Multi-Asset Defensive MR Basket 5-Asset Vol-Regime-Sized
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, BNBUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The champion's drawdown comes from choppy regimes where a flush does
 * not recover. This variant cuts the position size when realized volatility (ATR) is
 * elevated relative to its own trailing average — choppy markets get half the usual size,
 * calm mean-reversion markets get the full share — aiming to lower drawdown without giving
 * up calm-regime upside.
 * When it buys and sells: Same champion entries (Bollinger flush RSI<30 or Keltner pullback
 * RSI<40, rising 200-day average). Position is halved when current ATR is above its own
 * 60-bar average (elevated volatility). Exits via ATR-trail or price>EMA20 as in champion.
 * When it does NOT work: If the biggest recoveries happen right after high-vol flushes, the
 * halved size in those regimes gives up the best mean-reversion bounces. Vol-regime is a
 * lagging filter and may be too blunt.
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
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (!uptrend) return null;

  // Volatility regime: compare current ATR to the average ATR over the last 60 bars.
  // If current ATR is clearly above its trailing average, volatility is elevated -> halve size.
  let atrSum = 0, atrN = 0;
  for (let k = 1; k <= 60; k++) {
    const a = ctx.atr(14, k);
    if (a != null) { atrSum += a; atrN++; }
  }
  const sizeMult = (atrN > 30 && atr > (atrSum / atrN) * 1.2) ? 0.5 : 1.0; // >20% above avg = chop

  const bollingerFlush = price < lowerBand && rsi < 30;
  const keltnerPullback = price < keltnerLow && rsi < 40;

  if (bollingerFlush) {
    const qty = (ctx.cash / price) * 0.20 * sizeMult;
    if (qty <= 0) return null;
    ctx.state.peak = price;
    return { side: 'buy', qty: qty };
  }
  if (keltnerPullback) {
    const riskBudget = 0.025 * ctx.cash;
    let qty = riskBudget / atr;
    const maxQty = (ctx.cash / price) * 0.20 * sizeMult;
    qty = Math.min(qty, maxQty);
    if (qty <= 0) return null;
    ctx.state.peak = price;
    return { side: 'buy', qty: qty };
  }
  return null;
}
