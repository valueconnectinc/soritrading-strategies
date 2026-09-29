/*
 * @coinsori-strategy v1
 * name: Multi-Asset MR Basket Higher-Risk Sizing
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, BNBUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated 5-asset defensive MR basket uses only 1% risk per
 * trade, which gives tiny drawdowns (3-7%) but modest returns (10-17% over 5.5y). This
 * variant tests whether scaling the risk-per-trade up to 3% captures meaningfully more
 * upside while keeping drawdown acceptable — a risk-allocation change, not a curve-fit.
 * When it buys and sells: Identical entry/exit logic to the champion (Bollinger+Keltner
 * flush with RSI, rising 200-day gate, EMA20 snap-back / ATR trailing exit), only the
 * position size is larger.
 * When it does NOT work: Same as the champion — lags buy-and-hold in straight melt-ups
 * and sits in cash during coordinated bears. Higher sizing also means deeper drawdowns
 * in a volatile whipsaw recovery.
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
    const entry = ctx.state.high ? Math.max(ctx.state.high, price) : price;
    ctx.state.high = entry;
    const trailStop = entry - 2.5 * atr;
    if (price > ema20 || price < trailStop) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (!uptrend) return null;

  const bollingerFlush = price < lowerBand && rsi < 30;
  const keltnerPullback = price < keltnerLow && rsi < 40;

  if (bollingerFlush || keltnerPullback) {
    const legCash = ctx.cash;
    // Test: 3% of cash risked per ATR, up from the champion's 1%.
    const riskEq = 0.03 * legCash;
    const qty = riskEq / atr;
    const maxQty = (legCash / price) * 0.9;
    return { side: 'buy', qty: Math.min(qty, maxQty) };
  }
  return null;
}
