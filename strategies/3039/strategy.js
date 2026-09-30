/*
 * @coinsori-strategy v1
 * name: BTC 1D Dual-MR Hybrid Sizing (Staged Flush)
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated ATR-sized Dual-MR champion (3037) is consistently
 * positive with tiny drawdown, but its rare deepest Bollinger flush uses FULL cash,
 * which is its one documented risk: a wrong deep flush costs more than the ATR-sized
 * positions. This stages that full-cash entry into two tranches — 60% on the first
 * flush signal, and the remaining 40% only if price drops another ATR below the lower
 * band (a deeper, higher-conviction flush). This keeps every winning entry (it does
 * NOT filter trades out, unlike the failed bandwidth filter) while reducing the cost
 * of a wrong flush. The validated entry/exit logic and the ATR-Keltner pullback leg
 * are untouched.
 * When it buys and sells: Buy 60% cash on a deep Bollinger flush (close below lower
 * band 20,2.5 with RSI<30), add the remaining 40% if price drops a further ATR below
 * the lower band. Buy ATR-sized on an ATR-Keltner pullback (below EMA20-2.5*ATR with
 * RSI<40), both only inside a rising 200-day average. Sell on the snap-back above the
 * 20-day EMA or RSI>55.
 * When it does NOT work: In a sustained bear the rising-trend gate keeps us flat, and
 * it lags buy-and-hold in a relentless melt-up. A deep flush that snaps back without
 * dropping the extra ATR leaves us at 60% instead of full — slightly less upside on
 * the strongest entries.
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
    // Stage the full-cash flush: 60% now, and (below) add 40% if price drops
    // a further ATR below the lower band (deeper, higher-conviction flush).
    const firstQty = (ctx.cash / price) * 0.60;
    const deeperFlush = price < lowerBand - atr;
    if (deeperFlush) {
      const totalQty = (ctx.cash / price) * 0.95;
      return { side: 'buy', qty: totalQty };
    }
    return { side: 'buy', qty: firstQty };
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
