/*
 * @coinsori-strategy v1
 * name: BTC 1D ATR Chandelier Trend Rider
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Trend-following is the opposite family to the mean-reversion basket.
 * BTC spends long stretches in persistent trends; a chandelier (ATR-trailing) exit lets a
 * position ride a trend for its full length and cuts losers early with a volatility-scaled
 * stop. Uses only price/ATR — no external data.
 * When it buys and sells: Buy when price closes above the 50-day EMA while the 50-day EMA is
 * rising and price is above the 200-day average (long-only trend regime). Sell when price
 * closes below the highest high since entry minus 2.5x ATR (chandelier trailing stop) or
 * once the 50-day EMA turns back down.
 * When it does NOT work: In a range-bound / choppy market with no sustained trend, the
 * trailing stop whipsaws and gives back gains — trend following bleeds in chop. It also
 * gives up the top of a parabolic blow-off because the trailing stop lags the peak.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const ema50 = ctx.ema(50, 1);
  const ema50prev = ctx.ema(50, 2);
  const atr = ctx.atr(14, 1);
  const sma200 = ctx.sma(200, 1);
  if (ema50 == null || ema50prev == null || atr == null || sma200 == null || atr <= 0) return null;

  const pos = ctx.position;

  if (pos > 0) {
    // Chandelier exit: sell if price closes below (highest high since entry - 2.5 ATR).
    // 2.5 ATR scales the stop to current volatility; too tight whipsaws, too wide gives back.
    const hi = ctx.state.highestHigh || price;
    const stopPx = hi - 2.5 * atr;
    // Also exit if the medium-term trend itself turns down (EMA50 slope negative).
    if (price < stopPx || ema50 < ema50prev) {
      return { side: 'sell', qty: pos };
    }
    // Keep tracking the highest high since entry.
    if (price > hi) ctx.state.highestHigh = price;
    return null;
  }

  // Long-only trend regime: price above 200-SMA protects against bear chop.
  const uptrend = price > sma200 && ema50 > ema50prev;
  if (uptrend) {
    ctx.state.highestHigh = price; // start the chandelier from the entry bar
    const equity = ctx.cash + ctx.uPnl;
    const qty = (Number.isFinite(equity) && equity > 0 ? equity : ctx.cash) / price;
    return { side: 'buy', qty: qty * 0.98 };
  }
  return null;
}
