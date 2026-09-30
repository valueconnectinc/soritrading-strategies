/*
 * @coinsori-strategy v1
 * name: Multi-Asset Defensive MR Basket 5-Asset 4H Profit-Target
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, BNBUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The 4h MR basket's edge is buying oversold flushes in uptrends. The
 * champion exits on an ATR-trail or EMA20. This version tests a DIFFERENT exit family:
 * a fixed profit target (2.0x ATR above entry) — a classic mean-reversion exit that takes
 * the bounce and leaves, rather than riding a trend. Tests whether the edge is sensitive
 * to the exit mechanism.
 * When it buys and sells: On each asset, buy when price closes below the lower Bollinger
 * (20,2.5) with RSI<27, or below the ATR-adaptive Keltner low with RSI<37, inside a rising
 * 200-bar average, with a 3-bar cooldown. Sell when price reaches entry + 2.0x ATR
 * (profit target) or when price closes below the 20 EMA (stop loss).
 * When it does NOT work: Fixed targets cap winners in strong bounces that would have run
 * much further under a trailing exit. In a fast recovery the target is hit quickly (good),
 * but in a slow grind it may never reach the target and the EMA stop exits early.
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
    const entry = ctx.entryPx != null ? ctx.entryPx : ctx.state.entry;
    const target = entry + 2.0 * atr;   // fixed profit target: 2.0 ATR above entry
    if (price >= target || price < ema20) { // take profit or stop below EMA20
      ctx.state.entry = null;
      ctx.state.cooldown = ctx.i;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (ctx.state.cooldown != null && ctx.i - ctx.state.cooldown < 3) return null;

  if (!uptrend) return null;

  const bollingerFlush = price < lowerBand && rsi < 27;
  const keltnerPullback = price < keltnerLow && rsi < 37;

  if (bollingerFlush || keltnerPullback) {
    const riskBudget = 0.025 * ctx.cash;
    let qty = riskBudget / atr;
    const maxQty = (ctx.cash / price) * 0.20;
    qty = Math.min(qty, maxQty);
    if (qty <= 0) return null;
    ctx.state.entry = price;
    ctx.state.cooldown = null;
    return { side: 'buy', qty: qty };
  }
  return null;
}
