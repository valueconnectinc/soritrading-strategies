/*
 * @coinsori-strategy v1
 * name: Continuous Vol-Target Defensive Donchian OOS
 * ex: binance
 * syms: DOGEUSDT, ADAUSDT, LINKUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated defensive Donchian (55d-high breakout entry,
 * 30d-low / 3x-ATR exit, EMA50 downtrend gate) with CONTINUOUS vol-target sizing:
 * size = 3% / (ATR/price), clamped to [0.25, 0.99]. This targets constant daily
 * risk — risk less when volatility is high. It was validated on BTC/ETH/SOL 1d;
 * this run tests whether it generalizes to new altcoins on the same windows.
 * When it buys and sells: buys a 55d-high breakout (unless in a steep EMA50
 * downtrend), sizes by inverse volatility, exits on 30d-low break or 3x-ATR stop.
 * When it does NOT work: in a sustained calm bull it is fully invested and lags
 * buy-and-hold; and if a crash arrives without a prior volatility rise, the
 * vol-targeting does not help.
 */
function onUpdate(ctx) {
  const hh55 = ctx.high(55, 1);
  const ll30 = ctx.low(30, 1);
  const atr = ctx.atr(14, 1);
  const ema50 = ctx.ema(50, 1);
  if (hh55 == null || ll30 == null || atr == null || ema50 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
    if (price < ll30) return { side: 'sell', qty: pos };
    return null;
  }

  const inSteepDowntrend = price < ema50 - atr * 3;
  if (inSteepDowntrend) return null;

  if (price > hh55) {
    const volRatio = atr / price;
    // continuous inverse-vol sizing: target 3% daily risk, clamp for sanity
    const size = Math.min(0.99, Math.max(0.25, 0.03 / volRatio));
    return { side: 'buy', qty: ctx.cash / ctx.price * size };
  }
  return null;
}
