/*
 * @coinsori-strategy v1
 * name: Donchian Trend-Following ETH 1D (SMA Gate + Volume Confirm)
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Trend-following family. ETH breaks to 55-day highs in
 * sustained trends. A 200-SMA gate (only buy breakouts above the long-term
 * average) fixes the family's known range-bound whipsaw weakness. Adding a
 * volume confirmation (breakout must happen on above-average volume) filters
 * out low-participation false breakouts in chop, where price drifts to a new
 * high without real buying.
 * When it buys and sells: buys when price closes above the 55-day high AND
 * above the 200-SMA AND on above-average volume; sells when price closes below
 * the 30-day low.
 * When it does NOT work: still lags strong rallies that start from below the
 * 200-SMA (waits for the gate), and drawdowns are large (50-60%) because it
 * holds through full trend reversals. Trend-following is high-risk.
 */
function onUpdate(ctx) {
  const entry = ctx.high(55, 1);
  const exit = ctx.low(30, 1);
  const sma200 = ctx.sma(200, 1);
  if (entry == null || exit == null || sma200 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    // Exit: close below the 30-day low — trend has broken down.
    if (price < exit) return { side: 'sell', qty: pos };
    return null;
  }

  // Volume confirmation: current bar's volume vs its 20-bar average.
  // A real breakout needs participation; low-volume drift is a false signal.
  const avgVol = ctx.avgVol(20);
  if (avgVol != null && avgVol > 0 && ctx.vol < avgVol) {
    return null; // breakout on weak volume — skip
  }

  // Entry: only take breakouts when price is above the long-term trend.
  if (price > sma200 && price > entry) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
