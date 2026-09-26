/*
 * @coinsori-strategy v1
 * name: Donchian Hashrate Regime BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The defensive Donchian (55d-high entry, 30-day-low exit,
 * 3x-ATR disaster stop) is a confirmed cross-asset trend family and fits BTC 1d
 * best (lowest MDD 40-43% of the family). Its one weakness is underperforming in
 * strong sustained bulls because the 30-day stop exits too early. Hashrate is a
 * fundamental that lags price and signals bull/bear regime. This switches the
 * exit stop by regime: wider stop when hashrate is above its 30-day average
 * (miners expanding = bull, ride the trend), tight defensive stop otherwise.
 * When it buys and sells: buys a 55-day-high breakout (unless steep downtrend);
 * exits on a 30-day low (tight) or a 60-day low (wide) depending on hashrate
 * regime, plus a 3x-ATR disaster stop from entry.
 * When it does NOT work: still has high drawdown in sharp reversals; hashrate
 * lags price so a bull regime can persist into an early bear. Higher-risk trend.
 */
function onUpdate(ctx) {
  const hh55 = ctx.high(55, 1);
  const ll30 = ctx.low(30, 1);
  const ll60 = ctx.low(60, 1);
  const atr = ctx.atr(14, 1);
  const ema50 = ctx.ema(50, 1);
  if (hh55 == null || ll30 == null || ll60 == null || atr == null || ema50 == null) return null;

  // hashrate regime: bull when raw hashrate is above its 30-day smoothed average
  // (miners expanding capacity = fundamental accumulation). null-safe: if data
  // missing, default to tight defensive stop (bullRegime=false) — safer.
  const hr = ctx.data('hashrate');
  const hrSma = ctx.data('hashrate_sma30');
  const bullRegime = (hr != null && hrSma != null) ? hr > hrSma : false;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
    // wide 60d stop in bull regime (ride the trend), tight 30d stop otherwise
    const stop = bullRegime ? ll60 : ll30;
    if (price < stop) return { side: 'sell', qty: pos };
    return null;
  }

  const inSteepDowntrend = price < ema50 - atr * 3;
  if (inSteepDowntrend) return null;

  if (price > hh55) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
