/*
 * @coinsori-strategy v1
 * name: Multi-Asset Defensive MR Basket Pure-Trail Exit
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Defensive mean-reversion is the only robust cross-asset edge on 1d,
 * and a 4-asset basket smooths single-asset 'sits in cash' weakness. This variant removes
 * the EMA20 snap-back take-profit entirely and exits ONLY on the ATR trailing stop, so a
 * strong recovery is never cut short by an early bounce sell. Test: does pure-trailing beat
 * the mixed (EMA20 OR trail) exit that won last cycle?
 * When it buys and sells: Buy on each asset when price closes below the lower Bollinger
 * (20,2.5) with RSI<30, or below the ATR-adaptive Keltner low with RSI<40, only in a rising
 * 200-day average. Sell only when price drops 2.5 ATR below the highest close since entry.
 * When it does NOT work: In a broad crypto bear all gates stay flat (capital safe, little
 * upside), and in a straight-line melt-up it lags buy-and-hold. A pure trailing stop gives
 * back more of a peak before exiting than a fixed snap-back sell does.
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
    // Track the highest close since entry.
    const entry = ctx.state.high ? Math.max(ctx.state.high, price) : price;
    ctx.state.high = entry;
    // PURE trailing stop: no EMA20 snap-back sell. Only exit on a 2.5 ATR pullback.
    const trailStop = entry - 2.5 * atr;
    if (price < trailStop) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (!uptrend) return null;

  const bollingerFlush = price < lowerBand && rsi < 30;
  const keltnerPullback = price < keltnerLow && rsi < 40;

  if (bollingerFlush || keltnerPullback) {
    const legCash = ctx.cash;
    const riskEq = 0.01 * legCash;
    const qty = riskEq / atr;
    const maxQty = (legCash / price) * 0.9;
    return { side: 'buy', qty: Math.min(qty, maxQty) };
  }
  return null;
}
