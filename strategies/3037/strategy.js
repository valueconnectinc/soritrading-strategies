/*
 * @coinsori-strategy v1
 * name: BTC 1D Dual-MR Hybrid Sizing
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated ATR-sized Dual-MR champion (3036) is consistently
 * positive with tiny drawdown but its small ATR-sized positions starve returns in rallies
 * (every trade risks only 2.5% of cash). This is a principled sizing split: the rare,
 * deepest Bollinger flush (price far below lower band + RSI<30) gets FULL cash because
 * these are the highest-conviction capitulation entries; the more frequent ATR-Keltner
 * pullback keeps the inverse-ATR sizing to limit the number of moderate positions. Only
 * the sizing changes — the validated entry/exit logic is untouched.
 * When it buys and sells: Buy on a deep Bollinger flush (close below lower band 20,2.5
 * with RSI<30) at full ~95% cash, OR on an ATR-Keltner pullback (below EMA20-2.5*ATR with
 * RSI<40) sized inversely to ATR, both only inside a rising 200-day average. Sell on the
 * snap-back above the 20-day EMA or RSI>55.
 * When it does NOT work: In a sustained bear the rising-trend gate keeps us flat, and it
 * lags buy-and-hold in a relentless melt-up. Full-cash entry on a wrong deep flush costs
 * more than the pure ATR-sized version.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
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

  if (pos > 0) {
    if (price > ema20 || rsi > 55) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (!uptrend) return null;

  const bollingerFlush = price < lowerBand && rsi < 30;
  const keltnerPullback = price < keltnerLow && rsi < 40;

  if (bollingerFlush) {
    // Deepest capitulation flush: highest conviction, size at full ~95% cash.
    const qty = (ctx.cash / price) * 0.95;
    return { side: 'buy', qty: qty };
  }
  if (keltnerPullback) {
    // Moderate pullback: risk-scaled inverse-ATR to limit position count/drawdown.
    const riskBudget = 0.025 * ctx.cash;
    let qty = riskBudget / atr;
    const maxQty = (ctx.cash / price) * 0.95;
    qty = Math.min(qty, maxQty);
    if (qty <= 0) return null;
    return { side: 'buy', qty: qty };
  }
  return null;
}
