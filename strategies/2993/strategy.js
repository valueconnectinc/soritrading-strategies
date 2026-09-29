/*
 * @coinsori-strategy v1
 * name: BTC 1D Crash-Buy + Trend-Ride Hybrid
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The pure crash-buyer (buy deep capitulation) was strong in the recent
 * range regime but flat in bull markets because it only buys crashes. This hybrid keeps the
 * crash-buy entry for panic bottoms AND adds a trend-ride entry so it can also participate
 * in bull markets. It is a different combination than the Keltner-pullback champion.
 * When it buys and sells: Buy either (a) after a deep crash (price >=22% below 90-day high
 * with RSI<28) — capitulation reversion, or (b) on a fresh 55-day high break (momentum
 * entry for trending bulls). Sell when price closes below the 20-day EMA or the 200-day
 * trend turns down; plus a hard stop 2.5x ATR below entry for the crash trades.
 * When it does NOT work: The trend-ride leg adds bull participation but also adds whipsaw
 * in a flat range, and the crash-buy leg still catches falling knives in a sustained bear.
 * Two entries means more trades and fees than a single-idea strategy.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const rsi = ctx.rsi(14, 1);
  const atr = ctx.atr(14, 1);
  const ema20 = ctx.ema(20, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  const high90 = ctx.high(90, 1);
  const high55 = ctx.high(55, 2);
  if (rsi == null || atr == null || ema20 == null || sma200 == null || sma200prev == null ||
      high90 == null || high55 == null || atr <= 0) return null;

  const pos = ctx.position;

  if (pos > 0) {
    // Shared exit: below 20-day EMA or long-term trend turns down.
    if (price < ema20 || sma200 < sma200prev) {
      return { side: 'sell', qty: pos };
    }
    // Hard stop for crash trades (deep loss protection).
    if (ctx.entryPx != null && price < ctx.entryPx - 2.5 * atr) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Crash-buy entry: deep drawdown from 90-day high + oversold RSI.
  const crashDepth = 1 - price / high90;
  const crashEntry = crashDepth >= 0.22 && rsi < 28;

  // Trend-ride entry: fresh 55-day high break inside a rising 200-day trend.
  const trendEntry = sma200 > sma200prev && price > high55;

  if (crashEntry || trendEntry) {
    const equity = ctx.cash + ctx.uPnl;
    const qty = (Number.isFinite(equity) && equity > 0 ? equity : ctx.cash) / price;
    return { side: 'buy', qty: qty * 0.98 };
  }
  return null;
}
