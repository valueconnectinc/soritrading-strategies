/*
 * @coinsori-strategy v1
 * name: BTC 1D Dual-MR Risk-Scaled (ATR-sized)
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated BTC 1D Dual-MR champion (3007) is the only edge that
 * reproduces across disjoint windows, but its full-cash sizing gives ~26% drawdown on a
 * single deep flush. This is a principled improvement: size each rare MR entry inversely
 * to ATR (smaller position when volatility is high) to cut drawdown while keeping the
 * validated entry/exit logic untouched. Only the sizing changes — no new parameters fit.
 * When it buys and sells: Buy when price closes below the lower Bollinger (20,2.5) with
 * RSI<30, OR below the ATR-adaptive Keltner low with RSI<40, only inside a rising 200-day
 * average. Size = risk-budget divided by ATR so high-vol flushes get smaller positions.
 * Sell on the snap-back above the 20-day EMA or when RSI climbs above 55.
 * When it does NOT work: In a sustained bear the rising-trend gate keeps us flat (little
 * upside), and it lags buy-and-hold in a relentless melt-up. ATR-sizing also reduces
 * position (and profit) in high-volatility recoveries.
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

  // The shared defensive gate: only mean-revert inside a rising long-term trend.
  const uptrend = sma200 > sma200prev;
  const lowerBand = bb.lower;
  // ATR-adaptive lower Keltner band (EMA20 - 2.5*ATR) for the second MR signal.
  const keltnerLow = ema20 - 2.5 * atr;

  if (pos > 0) {
    // Take the snap-back profit above the 20-day EMA or once RSI recovers.
    if (price > ema20 || rsi > 55) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (!uptrend) return null;

  const bollingerFlush = price < lowerBand && rsi < 30;
  const keltnerPullback = price < keltnerLow && rsi < 40;

  if (bollingerFlush || keltnerPullback) {
    // RISK-SCALED sizing: risk a fixed 2.5% of cash per trade, converted to coins via ATR.
    // High-volatility flushes get smaller positions, cutting the full-cash drawdown risk.
    const riskBudget = 0.025 * ctx.cash;
    let qty = riskBudget / atr;
    const maxQty = (ctx.cash / price) * 0.95;
    qty = Math.min(qty, maxQty);
    if (qty <= 0) return null;
    return { side: 'buy', qty: qty };
  }
  return null;
}
