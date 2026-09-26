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
 * best. Its one weakness is underperforming in strong sustained bulls because
 * the 30-day stop exits too early. This widens the exit stop to a 60-day low
 * ONLY when a strong bull is confirmed (hashrate above its 30-day average AND
 * price above EMA100), so it rides strong bulls while keeping the tight
 * defensive stop everywhere else.
 * When it buys and sells: buys a 55-day-high breakout (unless steep downtrend);
 * exits on a 30-day low (tight) or a 60-day low (wide, only in confirmed bull),
 * plus a 3x-ATR disaster stop from entry.
 * When it does NOT work: still high drawdown in sharp reversals; hashrate lags
 * price so a bull regime can persist into an early bear. Higher-risk trend.
 */
function onUpdate(ctx) {
  const hh55 = ctx.high(55, 1);
  const ll30 = ctx.low(30, 1);
  const ll60 = ctx.low(60, 1);
  const atr = ctx.atr(14, 1);
  const ema50 = ctx.ema(50, 1);
  const ema100 = ctx.ema(100, 1);
  if (hh55 == null || ll30 == null || ll60 == null || atr == null || ema50 == null || ema100 == null) return null;

  // confirmed bull: hashrate above its 30d average AND price above EMA100
  const hr = ctx.data('hashrate');
  const hrSma = ctx.data('hashrate_sma30');
  const hrBull = (hr != null && hrSma != null) ? hr > hrSma : false;
  const price = ctx.price;
  const bullRegime = hrBull && price > ema100;

  const pos = ctx.position;

  if (pos > 0) {
    if (price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
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
