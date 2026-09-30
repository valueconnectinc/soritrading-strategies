/*
 * @coinsori-strategy v1
 * name: Multi-Asset MR Basket 5-Asset 4H Tiered-Profit Exit
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, BNBUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The single fixed profit-target basket (2.0x ATR) is ultra-defensive
 * (sub-1.3% MDD) but caps winners in strong bounces. This tests a TIERED exit: take a
 * smaller first profit (1.5x ATR) to lock in gains, then let the remaining position run
 * to a larger target (3.0x ATR) or the EMA20 stop. The goal is to raise return without
 * giving back the ultra-low drawdown.
 * When it buys and sells: buy below lower Bollinger (20,2.5) RSI<27 or Keltner low RSI<37
 * in a rising 200-bar avg with 3-bar cooldown; sell half at entry+1.5x ATR, the rest at
 * entry+3.0x ATR or below EMA20.
 * When it does NOT work: in a choppy market the second leg rarely reaches 3.0x ATR and
 * the EMA20 stop takes it out at a loss, so the tiered exit can underperform a plain
 * single target on efficiency.
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
    const st = ctx.state;
    // Tier 1: take half the position at the small target.
    if (st.tier !== 'halfSold' && price >= entry + 1.5 * atr) {
      st.tier = 'halfSold';
      return { side: 'sell', qty: pos * 0.5 };
    }
    // Tier 2: remaining half runs to the large target or the EMA20 stop.
    if (price >= entry + 3.0 * atr || price < ema20) {
      st.entry = null;
      st.cooldown = ctx.i;
      st.tier = null;
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
    ctx.state.tier = null;
    return { side: 'buy', qty: qty };
  }
  return null;
}
