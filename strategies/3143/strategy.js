/*
 * @coinsori-strategy v1
 * name: ADA 1D Donchian Breakout Trend
 * ex: binance
 * syms: ADAUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Assets that break out of a long consolidation range often
 * keep trending for weeks. A Donchian channel breakout (buy the highest high of
 * the last 55 days) catches these moves on ADA, the one asset where this recipe
 * held up in earlier testing (it failed on BTC/XRP/ETH). Trend-following is a
 * completely different family from the mean-reversion champions.
 * When it buys and sells: buys when the daily close breaks above the highest
 * high of the previous 55 days; sells when the close breaks below the lowest
 * low of the previous 20 days (faster exit than the 30d — cuts crash drawdown).
 * Always fully in or fully out.
 * When it does NOT work: in long sideways/choppy markets the breakout whipsaws —
 * repeated false breakouts bleed small losses. It also gives back part of the
 * trend on every pullback. Do not expect it to beat a strong buy-and-hold in a
 * straight melt-up; it wins by avoiding the crashes.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  // Donchian channels on CLOSED bars only (ago=1) so backtest==live.
  const hi55 = ctx.high(55, 1); // highest high of the last 55 closed bars
  const lo20 = ctx.low(20, 1);  // lowest low of the last 20 closed bars
  if (hi55 == null || lo20 == null) return null;

  ctx.watch([
    { side: 'buy', price: hi55, note: '55d high breakout' },
    { side: 'sell', price: lo20, note: '20d low exit' }
  ]);

  const pos = ctx.position;
  if (pos > 0) {
    if (price < lo20) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (price > hi55) {
    return { side: 'buy', qty: (ctx.cash / price) * 0.99 };
  }
  return null;
}
