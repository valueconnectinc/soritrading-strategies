/*
 * @coinsori-strategy v1
 * name: BTC 1D Stop-Protected Bear MR
 * ex: upbit
 * syms: BTC
 * interval: 1d
 * cash: 10000000
 *
 * Why this strategy: The validated BTC 1D Dual-MR champion uses a rising-200d gate to avoid
 * bears — safe but flat in a bear. This variant tests a DIFFERENT defensive mechanism: drop
 * the trend gate and buy deep-oversold flushes even in a bear, but protect each position with
 * a hard stop (2.0 ATR below entry) so a failed flush is cut in a few days instead of ridden
 * down. The bet: deep capitulation bounces even in a bear, and the stop turns failures into
 * small losses instead of a drawdown.
 * When it buys and sells: Buy when price closes below the lower Bollinger (20,2.5) with
 * RSI<30, or below the ATR-adaptive Keltner low (EMA20-2.5*ATR) with RSI<35. No trend gate.
 * Sell on a hard stop 2.0 ATR below entry, or when price closes back above the 20-day EMA,
 * or once RSI recovers above 55.
 * When it does NOT work: In a sustained grinding bear with repeated failed bounces, the
 * stop eats capital on each whipsaw (higher drawdown than the gate champion). It is NOT a
 * buy-and-hold substitute and is higher-risk than the conservative 200d-gate champion.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const bb = ctx.bb(20, 2.5, 1);
  const rsi = ctx.rsi(14, 1);
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  if (bb == null || rsi == null || ema20 == null || atr == null || atr <= 0) return null;

  const lowerBand = bb.lower;
  const keltnerLow = ema20 - 2.5 * atr;

  const pos = ctx.position;
  if (pos > 0) {
    const entry = ctx.state.entry != null ? ctx.state.entry : price;
    const hardStop = entry - 2.0 * atr; // cut a failed flush before it becomes a drawdown
    if (price < hardStop || price > ema20 || rsi > 55) {
      ctx.state.entry = null;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const bollingerFlush = price < lowerBand && rsi < 30;
  const keltnerPullback = price < keltnerLow && rsi < 35;

  if (bollingerFlush || keltnerPullback) {
    const qty = (ctx.cash / price) * 0.9;
    if (qty <= 0) return null;
    ctx.state.entry = price;
    return { side: 'buy', qty: qty };
  }
  return null;
}
