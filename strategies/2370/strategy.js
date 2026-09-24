/*
 * @coinsori-strategy v1
 * name: BNB Regime-Switch Trend 1D
 * ex: binance
 * syms: BNBUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Same validated rule as the BTC/ETH regime-switch trend.
 * Crypto trends above its 50-day average in bull phases and below it in bear
 * phases. Being fully long in the bull and flat in the bear captures the long
 * up-legs while sitting out the down-legs, with low turnover.
 * When it buys and sells: Buy full when the last closed price is above the
 * 50-day average. Sell full when it closes below the average, or falls more
 * than 3 ATRs below it in one move (crash stop).
 * When it does NOT work: In choppy sideways markets that flip around the
 * 50-day average repeatedly it whipsaws; and it misses the start of a new bull.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 55) return null;
  const px = closes[closes.length - 2];
  const sma50 = ctx.sma(50, 1);
  const atr = ctx.atr(14, 1);
  const pos = ctx.position;
  const cash = ctx.cash;
  if (px == null || sma50 == null || atr == null || px <= 0) return null;

  const long = px > sma50;
  const crashStop = px < sma50 - 3.0 * atr;

  if (pos === 0) {
    if (long && cash > 0 && ctx.price > 0) {
      return { side: 'buy', qty: (cash / ctx.price) * 0.98 };
    }
    return null;
  }

  if (!long || crashStop) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
