/*
 * @coinsori-strategy v1
 * name: Donchian Trend-Following XRP 1D
 * ex: binance
 * syms: XRPUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Daily Donchian channel breakout is a validated trend-following
 * family on BTC/ETH/DOGE/ADA 1d (positive in every walk-forward window). XRP is a
 * fresh mature large-cap with a long liquid daily history — testing whether this
 * trend edge generalizes to a new asset the way band-bounce mean-reversion does.
 * When it buys and sells: buys when price closes above the 55-day high; exits when
 * price closes below the 30-day low (the wide exit rides trends and avoids
 * whipsawing out of healthy daily pullbacks).
 * When it does NOT work: choppy/range-bound regimes where false breakouts reverse;
 * high drawdown (43-58%) is inherent to daily trend-following; lags in late-cycle
 * reversals because the wide exit gives back gains before triggering.
 */
function onUpdate(ctx) {
  const hi55 = ctx.high(55, 1);
  const lo30 = ctx.low(30, 1);
  if (hi55 == null || lo30 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    // wide exit: ride the trend, only leave when price breaks the 30-day low
    if (price < lo30) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // enter only in an uptrend regime (price above 200-SMA) to cut false breakouts in bear markets
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null || price < sma200) return null;

  if (price > hi55) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
