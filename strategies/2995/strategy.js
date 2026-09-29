/*
 * @coinsori-strategy v1
 * name: BTC 1D Dual-MR Defensive (Bollinger+Keltner)
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The ledger is unambiguous — on BTC 1D every trend-following and
 * trend-capture family fails, while defensive mean-reversion is the only validated edge.
 * This strategy combines my two independently-validated MR signals (Bollinger-RSI flush
 * and ATR-adaptive Keltner pullback) into one defensive core, still gated by a rising
 * 200-day trend so we never catch a falling knife in a broad bear. It trades rarely.
 * When it buys and sells: Buy when price closes below the lower Bollinger band (20,2.5)
 * with RSI<30, OR below the ATR-adaptive lower Keltner band with RSI<40, all only inside a
 * rising 200-day average. Size by ATR risk (1% equity) capped at 90% cash. Sell on the
 * snap-back above the 20-day EMA, once RSI climbs above 55, or if price falls below a
 * 2.5-ATR trailing stop from the entry (lets a strong flush run, cuts a weak one).
 * When it does NOT work: In a sustained bear the rising-trend gate keeps us flat
 * (capital-safe but little upside), and it lags buy-and-hold in a relentless melt-up.
 * Low trade count means the edge depends on the few flushes that mark a local bottom.
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
    // Track the highest price since entry to place a trailing stop below it.
    if (ctx.state.hi == null || price > ctx.state.hi) ctx.state.hi = price;
    // Trailing stop: 2.5 ATR below the running high — lets a strong snap-back run.
    const trailStop = ctx.state.hi - 2.5 * atr;
    // Exit on snap-back above the 20-day EMA, RSI recovery, or the trailing stop.
    if (price > ema20 || rsi > 55 || price < trailStop) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (!uptrend) return null;

  // Two independent deep-oversold MR triggers, OR'd together.
  const bollingerFlush = price < lowerBand && rsi < 30;
  const keltnerPullback = price < keltnerLow && rsi < 40;

  if (bollingerFlush || keltnerPullback) {
    // ATR-scaled size: risk 1% of equity per trade, capped at 90% of cash.
    const riskEq = 0.01 * ctx.cash;
    const qty = riskEq / atr;
    const maxQty = (ctx.cash / price) * 0.9;
    // Reset the trailing-stop high at entry.
    ctx.state.hi = price;
    return { side: 'buy', qty: Math.min(qty, maxQty) };
  }
  return null;
}
