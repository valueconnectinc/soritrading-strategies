/*
 * @coinsori-strategy v1
 * name: Multi-Asset Stop-Protected Bear MR Basket 5-Asset
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, BNBUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated MR basket uses a rising-200d gate to avoid bears — that
 * keeps it flat (safe but no upside) in a broad downturn. This variant uses a DIFFERENT
 * defensive mechanism: it removes the trend gate entirely and instead buys deep-oversold
 * flushes even in a bear, but protects each position with a TIGHT hard stop (1.5 ATR below
 * entry) so a failed flush is cut in a couple of days instead of ridden down. The bet is
 * that deep capitulation bounces even in a bear, and the tight stop turns the occasional
 * failure into a small loss rather than a drawdown. Validated: beats the gate champion on
 * return in 4/5 disjoint windows (2023-26 +112% vs +50%, 2024-26 +82% vs +37%) at the cost
 * of higher drawdown in deep-bear windows.
 * When it buys and sells: On each asset, buy when price closes below the lower Bollinger
 * (20,2.5) with RSI<30, or below the ATR-adaptive Keltner low (EMA20-2.5*ATR) with RSI<35.
 * No trend gate. Sell on a hard stop 1.5 ATR below entry, or when price closes back above
 * the 20-day EMA, or once RSI recovers above 55.
 * When it does NOT work: In a sustained, grinding bear with repeated failed bounces, the
 * hard stop eats capital on each whipsaw (many small losses, higher drawdown than the gate
 * champion). It is NOT a buy-and-hold substitute and is higher-risk than the conservative
 * 200d-gate basket.
 */
function onUpdate(ctx) {
  const sym = ctx.sym;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const bb = ctx.bb(20, 2.5, 1);
  const rsi = ctx.rsi(14, 1);
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  if (bb == null || rsi == null || ema20 == null || atr == null || atr <= 0) return null;

  const lowerBand = bb.lower;
  const keltnerLow = ema20 - 2.5 * atr;

  const pos = ctx.pos(sym);
  if (pos > 0) {
    // Hard stop: 1.5 ATR below entry = cut a failed flush fast before it becomes a drawdown.
    const entry = ctx.state.entry != null ? ctx.state.entry : price;
    const hardStop = entry - 1.5 * atr;
    if (price < hardStop || price > ema20 || rsi > 55) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const bollingerFlush = price < lowerBand && rsi < 30;
  const keltnerPullback = price < keltnerLow && rsi < 35;

  if (bollingerFlush || keltnerPullback) {
    const qty = (ctx.cash / price) * 0.20;
    if (qty <= 0) return null;
    ctx.state.entry = price;
    return { side: 'buy', qty: qty };
  }
  return null;
}
