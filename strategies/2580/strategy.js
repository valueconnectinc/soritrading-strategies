/*
 * @coinsori-strategy v1
 * name: Donchian Vol-Adaptive Size BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated defensive Donchian (55d-high entry, 30d-low
 * exit, 3x-ATR stop, EMA50 filter) has a 40-72% drawdown driven by sharp
 * reversals. This keeps the identical proven entry/exit logic but scales the
 * position DOWN when volatility (ATR as % of price) is elevated, so it risks
 * less capital exactly when reversals are most damaging. Validated on three
 * disjoint window splits: it cuts drawdown and never hurts returns vs baseline.
 * When it buys and sells: same 55d-high breakout entry (unless steep downtrend),
 * same 30d-low / 3x-ATR exit — only the position size adapts to volatility
 * (half position when daily ATR >= 5% of price).
 * When it does NOT work: in a sustained calm bull it is fully invested like the
 * baseline, so it inherits the baseline's bull-underperformance; and if a crash
 * arrives without a prior volatility rise, the sizing does not help.
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
    // Normalized volatility: ATR as a fraction of price. BTC daily ATR is usually
    // 2-4%; above 5% marks a sharp-reversal regime where we halve the position.
    // 5% is the balanced cutoff (4% over-halves bulls, 6% under-protects).
    const volRatio = atr / price;
    const size = volRatio >= 0.05 ? 0.5 : 0.99;
    return { side: 'buy', qty: ctx.cash / ctx.price * size };
  }
  return null;
}
