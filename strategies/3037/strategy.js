/*
 * @coinsori-strategy v1
 * name: BTC 1D Dual-MR Hybrid Sizing + Trailing Exit
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The hybrid-sizing Dual-MR champion (3037) was validated across four
 * disjoint BTC windows with no losing window, but its fixed exit (price > EMA20 or RSI>55)
 * sells a deep-flush full-cash position at the first touch of the 20-day EMA — the documented
 * weakness is that it lags buy-and-hold in a relentless melt-up. This version keeps the exact
 * same entry/sizing logic and only changes the exit for DEEP entries: instead of the snap-back,
 * a deep-flush position rides the trend under an ATR-trailing stop, so a capitulation bottom
 * that turns into a real rally is held instead of sold at the first bounce. Moderate pullback
 * positions keep the fast snap-back exit (they are risk-scaled and should not be held long).
 * When it buys and sells: Deep Bollinger flush (RSI<30) buys full cash and is held until price
 * falls more than 3.5*ATR from the highest close since entry, or RSI>72 (overbought profit take).
 * ATR-Keltner pullback (RSI<40) buys ATR-sized and exits on the EMA20 snap-back or RSI>55.
 * Both only inside a rising 200-day average.
 * When it does NOT work: In a choppy range the trailing stop whipsaws a deep entry out at a loss
 * where the old snap-back would have banked a small gain; and holding a full-cash position longer
 * increases drawdown if the post-flush rally fails. Loses to buy-and-hold in a straight melt-up
 * with no flush to enter.
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

  // Track how this position was entered so we can use the right exit.
  // deep=1 means a full-cash Bollinger flush entry (trailing exit), else pullback (snap-back).
  const entryKind = ctx.state.deepEntry === 1 ? 1 : 0;

  if (pos > 0) {
    if (entryKind === 1) {
      // Deep-flush full-cash entry: ride the trend under an ATR trailing stop.
      const peak = Math.max(ctx.state.deepPeak || price, price);
      ctx.state.deepPeak = peak;
      // Trail 3.5*ATR below the highest close since entry; also take profit if very overbought.
      if (price < peak - 3.5 * atr || rsi > 72) {
        ctx.state.deepEntry = 0;
        ctx.state.deepPeak = 0;
        return { side: 'sell', qty: pos };
      }
      return null;
    }
    // Pullback entry: fast snap-back exit (validated behavior, keep it).
    if (price > ema20 || rsi > 55) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (!uptrend) return null;

  const bollingerFlush = price < lowerBand && rsi < 30;
  const keltnerPullback = price < keltnerLow && rsi < 40;

  if (bollingerFlush) {
    ctx.state.deepEntry = 1;
    ctx.state.deepPeak = price;
    const qty = (ctx.cash / price) * 0.95;
    return { side: 'buy', qty: qty };
  }
  if (keltnerPullback) {
    ctx.state.deepEntry = 0;
    const riskBudget = 0.025 * ctx.cash;
    let qty = riskBudget / atr;
    const maxQty = (ctx.cash / price) * 0.95;
    qty = Math.min(qty, maxQty);
    if (qty <= 0) return null;
    return { side: 'buy', qty: qty };
  }
  return null;
}
