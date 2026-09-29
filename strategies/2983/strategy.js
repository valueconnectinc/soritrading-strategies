/*
 * @coinsori-strategy v1
 * name: BTC 1D Donchian Breakout Trend Rider
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Classic Turtle-style trend following — enter on a Donchian channel
 * breakout and ride the trend with a wide ATR trailing stop. By design it trades rarely and
 * holds for long stretches, capturing the persistent trends BTC shows. Opposite family to
 * the mean-reversion basket. Uses only price/ATR.
 * When it buys and sells: Buy when price closes above the 20-day high AND price is above the
 * 200-day average (long-only trend regime). Sell when price closes below the highest high
 * since entry minus 4x ATR (a wide chandelier stop that avoids chop whipsaw).
 * When it does NOT work: In a range-bound / sideways market with no sustained breakouts it
 * buys false breakouts and the trailing stop gives back the small gains — trend following
 * bleeds in chop. It also gives up the top of a parabolic blow-off because the trailing stop
 * lags the peak.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const atr = ctx.atr(14, 1);
  const sma200 = ctx.sma(200, 1);
  const high20 = ctx.high(20, 1); // highest high over the last 20 bars (closed)
  if (atr == null || sma200 == null || high20 == null || atr <= 0) return null;

  const pos = ctx.position;

  if (pos > 0) {
    // Wide chandelier exit: sell if price closes below (highest high since entry - 4 ATR).
    // 4 ATR is deliberately wide so the trend is not shaken out by normal pullbacks.
    const hi = ctx.state.highestHigh || price;
    const stopPx = hi - 4.0 * atr;
    if (price < stopPx) {
      return { side: 'sell', qty: pos };
    }
    if (price > hi) ctx.state.highestHigh = price;
    return null;
  }

  // Long-only trend regime: breakout above the 20-day high while above the 200-day average.
  const uptrend = price > sma200 && price > high20;
  if (uptrend) {
    ctx.state.highestHigh = price; // start the chandelier from the entry bar
    const equity = ctx.cash + ctx.uPnl;
    const qty = (Number.isFinite(equity) && equity > 0 ? equity : ctx.cash) / price;
    return { side: 'buy', qty: qty * 0.98 };
  }
  return null;
}
