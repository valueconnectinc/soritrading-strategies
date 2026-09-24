/*
 * @coinsori-strategy v1
 * name: BTC Slow-Trend Confirmed Regime 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated SMA50 regime-switch whipsaws in choppy
 * sideways markets where price flips around the 50-day average. Requiring price
 * to ALSO be above the 200-day average confirms a strong bull regime, so we skip
 * the chop while still capturing the long up-legs and sitting out the down-legs.
 * When it buys and sells: Buy full when the last closed price is above both the
 * 50-day and 200-day averages. Sell full when it closes below the 50-day average,
 * below the 200-day average, or falls more than 3 ATRs below the 50-day in one
 * move (crash stop).
 * When it does NOT work: In a strong bull that starts from a deep bear, the
 * 200-day gate delays entry until late, missing the early up-leg. It also still
 * whipsaws if price chops above both averages.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 205) return null;
  // Use the last CLOSED bar (ago=1) — deterministic and identical everywhere.
  const px = closes[closes.length - 2];
  const sma50 = ctx.sma(50, 1);
  const sma200 = ctx.sma(200, 1);
  const atr = ctx.atr(14, 1);
  const pos = ctx.position;
  const cash = ctx.cash;
  if (px == null || sma50 == null || sma200 == null || atr == null || px <= 0) return null;

  const strongBull = px > sma50 && px > sma200;
  const exitTrend = px < sma50 || px < sma200;
  const crashStop = px < sma50 - 3.0 * atr;

  if (pos === 0) {
    if (strongBull && cash > 0 && ctx.price > 0) {
      return { side: 'buy', qty: (cash / ctx.price) * 0.98 };
    }
    return null;
  }

  if (exitTrend || crashStop) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
