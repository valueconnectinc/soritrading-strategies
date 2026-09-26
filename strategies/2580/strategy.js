/*
 * @coinsori-strategy v1
 * name: Donchian Continuous Vol-Target Size BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated defensive Donchian (55d-high entry, 30d-low
 * exit, 3x-ATR stop, EMA50 filter) with binary vol-adaptive sizing (halve when
 * ATR>5% of price) already cut drawdown without hurting returns. This replaces
 * the hard 0.5/0.99 cliff with a CONTINUOUS vol-target curve: position size is
 * inversely proportional to normalized volatility (size = 3% / volRatio),
 * clamped between 0.25 and 0.99. It risks the same dollar amount of volatility
 * in every regime, so it protects even more in extreme-vol crashes while
 * staying fully invested in calm bulls.
 * When it buys and sells: same 55d-high breakout entry (unless steep downtrend),
 * same 30d-low / 3x-ATR exit — only the size scales continuously with ATR.
 * When it does NOT work: in a sustained calm bull it is fully invested like the
 * baseline, inheriting its bull-underperformance; and if a crash arrives with no
 * prior volatility rise, sizing cannot help.
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
    // Vol-target sizing: size = 3% / (ATR/price). At ATR 3% of price (calm) we
    // are fully invested; at 5% (elevated) ~0.6x; at 8% (crash) ~0.38x; floor
    // 0.25 so we never trade a token position. 3% is BTC's typical daily ATR,
    // so this targets a roughly constant daily risk budget.
    const volRatio = atr / price;
    const size = Math.max(0.25, Math.min(0.99, 0.03 / volRatio));
    return { side: 'buy', qty: ctx.cash / ctx.price * size };
  }
  return null;
}
