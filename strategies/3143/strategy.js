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
 * high of the previous 55 days. Sells when either the close breaks below the
 * lowest low of the previous 30 days OR the close falls more than 3.5x ATR(14)
 * below the highest close since entry (chandelier trailing stop — cuts the
 * worst crash drawdowns while letting strong trends run).
 * When it does NOT work: in long sideways/choppy markets the breakout whipsaws —
 * repeated false breakouts bleed small losses. It gives back part of the trend
 * on every pullback. Do not expect it to beat a strong buy-and-hold in a
 * straight melt-up; it wins by avoiding the crashes.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  // Donchian channels on CLOSED bars only (ago=1) so backtest==live.
  const hi55 = ctx.high(55, 1); // highest high of the last 55 closed bars
  const lo30 = ctx.low(30, 1);  // lowest low of the last 30 closed bars
  const atr = ctx.atr(14, 1);
  if (hi55 == null || lo30 == null || atr == null) return null;

  const S = ctx.state;
  const pos = ctx.position;
  if (pos > 0) {
    // Track the highest close since entry.
    if (price > (S.hh || 0)) S.hh = price;
    const chand = (S.hh || price) - 3.5 * atr;
    const exit = Math.max(lo30 ? 0 : 0, 0); // placeholder, replaced below
    // Exit if close breaks the 30d low OR the chandelier trailing stop.
    const chandExit = price < chand;
    const donExit = price < lo30;
    if (donExit || chandExit) {
      S.hh = 0;
      return { side: 'sell', qty: pos };
    }
    ctx.watch([
      { side: 'sell', price: chand, note: 'chandelier trail' },
      { side: 'sell', price: lo30, note: '30d low exit' }
    ]);
    return null;
  }

  ctx.watch([
    { side: 'buy', price: hi55, note: '55d high breakout' }
  ]);

  if (price > hi55) {
    return { side: 'buy', qty: (ctx.cash / price) * 0.99 };
  }
  return null;
}
