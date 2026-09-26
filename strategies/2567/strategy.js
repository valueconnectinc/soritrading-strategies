/*
 * @coinsori-strategy v1
 * name: Donchian Breakout ADA 1D
 * ex: binance
 * syms: ADAUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Trend-following via a Donchian channel breakout was the
 * only non-champion family the ledger marked "promising" (BTC/ETH 1d all six
 * walk-forward windows positive). Testing it on a fresh asset (ADA 1d) checks
 * whether this is a real second family or a one-asset fluke. Buy a new 55-day
 * high, exit on a 30-day low — a wide exit that lets winning trends run.
 * When it buys and sells: buys when price breaks above the highest high of the
 * last 55 days; sells when price breaks below the lowest low of the last 30 days.
 * When it does NOT work: it underperforms buy-and-hold in choppy/sideways
 * regimes (whipsawed by the wide channel) and has high drawdown in sharp
 * reversals because the 30-day exit is slow.
 */
function onUpdate(ctx) {
  const hh55 = ctx.high(55, 1);
  const ll30 = ctx.low(30, 1);
  if (hh55 == null || ll30 == null) return null;
  const pos = ctx.position;
  if (pos > 0) {
    if (ctx.price < ll30) return { side: 'sell', qty: pos };
    return null;
  }
  if (ctx.price > hh55) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
