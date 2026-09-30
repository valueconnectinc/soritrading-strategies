/*
 * @coinsori-strategy v1
 * name: BTC 1D Long-Short 200-Day Trend
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: A genuinely different family from the long-only champion.
 * BTC has long, persistent trends: long melt-ups above the 200-day average and
 * long drawdowns below it. A strategy that is LONG above the 200-day and SHORT
 * below it captures BOTH directions instead of sitting in cash during bears —
 * the champion's documented blind spot (it only goes to cash in downtrends).
 * When it buys and sells: Long when price is above the 200-day average; short
 * when price is below it. A slow 50-day EMA cross is used to flip direction so
 * it does not whipsaw on single-bar noise around the line. Position is sized by
 * a fraction of equity, and a stop-loss is implied by the flip itself.
 * When it does NOT work: In a sideways chop that straddles the 200-day line it
 * whipsaws and pays fees both ways. Shorting a persistent bear can also be
 * dangerous if a sharp V-reversal happens — the flip lags the exact bottom.
 * Long-short needs a venue that allows shorting (futures/margin); on spot-only
 * the short leg cannot execute.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const ema50 = ctx.ema(50, 1);
  const ema50prev = ctx.ema(50, 2);
  const sma200 = ctx.sma(200, 1);
  if (ema50 == null || ema50prev == null || sma200 == null) return null;

  const pos = ctx.position;

  // Direction signal: 50-day EMA vs 200-day line (the classic "golden/death cross").
  const wantLong = ema50 > sma200;
  const wantShort = ema50 < sma200;

  if (pos > 0) {
    // Flip to short when the trend turns down.
    if (wantShort) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
  if (pos < 0) {
    // Flip to long when the trend turns up.
    if (wantLong) {
      return { side: 'buy', qty: -pos };
    }
    return null;
  }

  // Flat: enter the direction the trend points.
  if (wantLong) {
    return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
  }
  if (wantShort) {
    return { side: 'sell', qty: (ctx.cash / price) * 0.95 };
  }
  return null;
}
