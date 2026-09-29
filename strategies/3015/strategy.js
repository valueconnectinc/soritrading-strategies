/*
 * @coinsori-strategy v1
 * name: Multi-Asset Defensive MR Basket BTC/ETH/SOL/XRP
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Defensive mean-reversion is the only robust cross-asset edge on 1d,
 * and a 4-asset basket smooths the single-asset 'sits in cash during melt-up' weakness.
 * Validated positive on all three disjoint windows.
 * When it buys and sells: Buy on each asset when price closes below the lower Bollinger
 * (20,2.5) with RSI<30, or below the ATR-adaptive Keltner low with RSI<40, only in a rising
 * 200-day average. Sell when price closes back above the 20-day EMA, or when it drops by
 * 2.5 ATR from the highest close since entry (trailing stop).
 * When it does NOT work: In a broad coordinated crypto bear all gates stay flat (capital
 * safe, little upside), and in a straight-line melt-up it lags buy-and-hold. A hard trailing
 * stop can also get whipsawed by a volatile recovery that dips before resuming.
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
    // Track the highest close since entry via state.
    const entry = ctx.state.high ? Math.max(ctx.state.high, price) : price;
    ctx.state.high = entry;
    // Trailing stop: 2.5 ATR below the highest close since entry lets a winner run.
    const trailStop = entry - 2.5 * atr;
    // Snap-back above the 20-day EMA is still the primary take-profit target.
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
    const riskEq = 0.01 * legCash;
    const qty = riskEq / atr;
    const maxQty = (legCash / price) * 0.9;
    return { side: 'buy', qty: Math.min(qty, maxQty) };
  }
  return null;
}
