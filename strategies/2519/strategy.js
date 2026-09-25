/*
 * @coinsori-strategy v1
 * name: FearGreed Contrarian LTC Generalization
 * ex: binance
 * syms: LTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: A generalization test of the validated fear-contrarian
 * mean-reversion champion on a fresh asset (LTC) it was not tuned on. If the
 * panic-buy edge (fear<40 + lower-BB break, mid-band exit) transfers to another
 * major coin, it confirms the signal is a market-wide crowd-behaviour effect,
 * not a BTC/SOL/ETH artifact.
 * When it buys: fear<40 AND price pierces the lower Bollinger band. Sells on
 * recovery to the middle band or after an 8% stop.
 * When it does NOT work: in a calm bull melt-up it sits in cash and lags
 * buy-and-hold; in a structural bear the bounce is weak and the stop bleeds.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const fg = ctx.data('fg');
  if (bb == null || bb.lower == null || bb.mid == null) return null;
  if (fg == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (price <= ctx.entryPx * 0.92) return { side: 'sell', qty: pos };
    if (price >= bb.mid) return { side: 'sell', qty: pos };
    return null;
  }

  if (fg < 40 && price < bb.lower) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  return null;
}
