/*
 * @coinsori-strategy v1
 * name: Donchian Trend-Following LTC 1D
 * ex: binance
 * syms: LTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The Donchian turtle trend-following family, validated on
 * BTC 1d (positive 3/3 walk-forward, low MDD) and generalizing to ETH 1d. It
 * rides sustained trends and is defensive via a 200-SMA gate. This is the one
 * trend family that works on 1d — a complement to the 4h band-bounce
 * mean-reversion champion. LTC is a fresh stable mature large-cap.
 * When it buys and sells: buys when price closes above the 55-day high while
 * above the 200-SMA (trend gate); exits when price closes below the 20-day low.
 * When it does NOT work: in range-bound chop it whipsaws; it lags the very
 * start of a melt-up (waits for a 55-day breakout); below the 200-SMA it stays
 * in cash. Defensive trend capture, not a fast momentum rider.
 */
function onUpdate(ctx) {
  const sma200 = ctx.sma(200, 1);
  const hh55 = ctx.high(55, 1);
  const ll20 = ctx.low(20, 1);
  if (sma200 == null || hh55 == null || ll20 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (price < ll20) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (price < sma200) return null; // trend gate: only buy above the long-term trend

  if (price > hh55) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
