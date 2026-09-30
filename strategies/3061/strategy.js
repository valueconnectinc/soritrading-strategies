/*
 * @coinsori-strategy v1
 * name: Multi-Asset Defensive MR Basket 5-Asset 4H Hybrid-Exit
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, BNBUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The 4h MR basket has a validated edge buying oversold flushes in
 * uptrends. Two exits were validated: a fixed 2.0x ATR target (ultra-low drawdown,
 * ~half the return) and an ATR-trail (higher return, higher drawdown). This version
 * tests a HYBRID exit that splits the difference: bank half the position at the fixed
 * profit target (which is what keeps drawdown low), then trail the remaining half with
 * a wider ATR-trail to capture more of the bounce.
 * When it buys and sells: On each asset, buy when price closes below the lower Bollinger
 * (20,2.5) with RSI<27, or below the ATR-adaptive Keltner low with RSI<37, inside a
 * rising 200-bar average, with a 3-bar cooldown. Sell half at entry + 2.0x ATR (fixed
 * target), then trail the rest at 2.5 ATR below the post-target peak, or close all below
 * the 20 EMA.
 * When it does NOT work: The trailing half can give back gains in a fast reversal after
 * the target is hit, and the fixed half caps the winner in strong bounces. In sustained
 * chop the trail whipsaws the remaining position.
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
    const targetHit = ctx.state.targetHit === true;

    // Stop loss always: close everything below the 20 EMA
    if (price < ema20) {
      ctx.state.entry = null;
      ctx.state.targetHit = null;
      ctx.state.peak = null;
      ctx.state.cooldown = ctx.i;
      return { side: 'sell', qty: pos };
    }

    if (!targetHit && price >= target) {
      // Bank half the position at the fixed target, keep the rest to trail
      ctx.state.targetHit = true;
      ctx.state.peak = price;
      const half = pos / 2;
      if (half > 0) return { side: 'sell', qty: half };
      return null;
    }

    if (targetHit) {
      // Trail the remaining half: 2.5 ATR below the post-target peak
      const peak = ctx.state.peak != null ? Math.max(ctx.state.peak, price) : price;
      ctx.state.peak = peak;
      const trailStop = peak - 2.5 * atr;
      if (price < trailStop) {
        ctx.state.entry = null;
        ctx.state.targetHit = null;
        ctx.state.peak = null;
        ctx.state.cooldown = ctx.i;
        return { side: 'sell', qty: pos };
      }
    }
    return null;
  }

  if (ctx.state.cooldown != null && ctx.i - ctx.state.cooldown < 3) return null; // 3-bar cooldown

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
    ctx.state.targetHit = false;
    ctx.state.peak = null;
    ctx.state.cooldown = null;
    return { side: 'buy', qty: qty };
  }
  return null;
}
