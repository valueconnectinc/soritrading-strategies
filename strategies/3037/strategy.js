/*
 * @coinsori-strategy v1
 * name: BTC 1D Dual-MR Hybrid Sizing RSI25
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Champion 3037's only real risk is the full-cash deep-flush entry
 * when a bottom turns out wrong. This tightens that entry: full cash is reserved for a
 * MORE extreme capitulation (RSI<25 instead of <30), so we only go all-in on true
 * flush-outs and keep the moderate Keltner pullback sized inversely to ATR as before.
 * The validated EMA20/RSI55 snap-back exit is untouched.
 * When it buys and sells: Buy full cash on a deep Bollinger flush with RSI<25, or a
 * risk-scaled pullback below EMA20-2.5*ATR with RSI<40, both only in a rising 200-day
 * average. Sell on snap-back above the 20-day EMA or RSI>55.
 * When it does NOT work: In a sustained bear the rising-trend gate keeps us flat; it
 * lags in a relentless melt-up. Fewer full-cash entries may give up some upside in
 * fast V-recoveries.
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

  const bollingerFlush = price < lowerBand && rsi < 25; // stricter: true capitulation only
  const keltnerPullback = price < keltnerLow && rsi < 40;

  if (bollingerFlush) {
    const qty = (ctx.cash / price) * 0.95;
    return { side: 'buy', qty: qty };
  }
  if (keltnerPullback) {
    const riskBudget = 0.025 * ctx.cash;
    let qty = riskBudget / atr;
    const maxQty = (ctx.cash / price) * 0.95;
    qty = Math.min(qty, maxQty);
    if (qty <= 0) return null;
    return { side: 'buy', qty: qty };
  }
  return null;
}
