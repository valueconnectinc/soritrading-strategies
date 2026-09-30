/*
 * @coinsori-strategy v1
 * name: LTC 1D Defensive MR Single-Leg Test
 * ex: binance
 * syms: LTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated 6-asset defensive MR basket (3017) has never included
 * LTC, but LTC already validated on 4h mean-reversion. Testing the exact champion recipe on
 * LTC 1d alone across disjoint windows tells us whether LTC responds to the same defensive
 * MR logic — if yes, it is a clean 7th-leg diversification candidate.
 * When it buys and sells: Buy when price closes below the lower Bollinger (20,2.5) with
 * RSI<30, or below the ATR-adaptive Keltner low with RSI<40, only in a rising 200-day
 * average. Sell when price closes back above the 20-day EMA, or drops 2.5 ATR from the
 * highest close since entry.
 * When it does NOT work: In a straight-line melt-up it lags buy-and-hold, and in a broad
 * coordinated bear all gates stay flat (capital safe, little upside).
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
    const riskEq = 0.03 * legCash;
    const qty = riskEq / atr;
    const maxQty = (legCash / price) * 0.9;
    return { side: 'buy', qty: Math.min(qty, maxQty) };
  }
  return null;
}
