/*
 * @coinsori-strategy v1
 * name: BTC 1D Dual-MR Defensive Full-Cash
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The ledger is unambiguous — on BTC 1D every trend-following and
 * trend-capture family fails, while defensive mean-reversion is the only validated edge.
 * This is the validated Dual-MR core (Bollinger-RSI flush OR ATR-Keltner pullback, rising
 * 200-day gate) with the documented FULL-CASH sizing upgrade: rare MR entries should be
 * sized with full cash, not starved by per-trade risk caps (validated on DOGE 1d and
 * ETH 4h in the ledger). It trades rarely and only buys genuine deep-oversold flushes.
 * When it buys and sells: Buy when price closes below the lower Bollinger band (20,2.5)
 * with RSI<30, OR below the ATR-adaptive lower Keltner band with RSI<40, all only inside a
 * rising 200-day average. Size with ~95% of cash. Sell on the snap-back above the 20-day
 * EMA or when RSI climbs above 55.
 * When it does NOT work: In a sustained bear the rising-trend gate keeps us flat
 * (capital-safe but little upside), and it lags buy-and-hold in a relentless melt-up.
 * Full-cash sizing means a single wrong flush costs more than the risk-sized version.
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

  // Two independent deep-oversold MR triggers, OR'd together.
  const bollingerFlush = price < lowerBand && rsi < 30;
  const keltnerPullback = price < keltnerLow && rsi < 40;

  if (bollingerFlush || keltnerPullback) {
    // FULL-CASH sizing: rare MR entries get ~95% of cash (ledger-validated upgrade).
    const qty = (ctx.cash / price) * 0.95;
    return { side: 'buy', qty: qty };
  }
  return null;
}
