/*
 * @coinsori-strategy v1
 * name: ETH BB-RSI Mean Reversion 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Mean reversion — sharp drops to the Bollinger lower band with
 * an oversold RSI are usually overreactions, and ETH tends to snap back toward its
 * average. We buy the panic, not the trend, so this is the opposite of the BTC
 * trend-following champion and diversifies the book.
 * When it buys and sells: Buys when ETH closes below its 20-day Bollinger lower
 * band AND RSI(14) is oversold (<35) AND price is still above its 100-day average
 * (so we are not catching a confirmed bear). Sells when price returns to the
 * Bollinger middle (20-day SMA), when RSI recovers above 50, or on a hard 2x ATR
 * stop. Position is sized so the stop risks only ~3% of the account.
 * When it does NOT work: In a real bear market the lower band keeps getting hit and
 * the "snap-back" never comes — the 100-day gate is too slow to save it. Also in
 * long quiet ranges the lower band is rarely touched, so it may sit idle for months.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const pos = ctx.position;
  if (!Number.isFinite(price) || price <= 0) return null;

  // All signals from CLOSED bars so backtest, paper and live are identical.
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const atr = ctx.atr(14, 1);
  const sma100 = ctx.sma(100, 1);
  if (bb == null || rsi == null || atr == null || sma100 == null) return null;
  if (bb.lower == null || bb.mid == null) return null;

  const touch = price < bb.lower;
  const oversold = rsi < 35;
  const trendOk = price > sma100;

  if (pos === 0) {
    ctx.watch([{ side: 'buy', price: bb.lower, trigger: 'below', note: 'BB lower touch',
      conds: [{ label: 'RSI(14) < 35', now: rsi, op: '<', ref: 35, closed: true },
              { label: 'price > 100d SMA', ok: price > sma100 }] }]);
    if (touch && oversold && trendOk && atr > 0) {
      // risk 3% of account on a 2x ATR stop — mean reversion can dip further before snapping back
      const qty = Math.min((ctx.cash * 0.03) / (2 * atr), (ctx.cash / price) * 0.99);
      if (qty <= 0) return null;
      return { side: 'buy', qty: qty };
    }
    return null;
  }

  const stopPx = ctx.entryPx - 2 * atr;
  ctx.watch([
    { side: 'sell', price: bb.mid, trigger: 'above', note: 'back to mid' },
    { side: 'sell', price: stopPx, trigger: 'below', note: '2x ATR hard stop' }
  ]);
  if (price <= stopPx) return { side: 'sell', qty: pos };
  if (price > bb.mid) return { side: 'sell', qty: pos };
  if (rsi > 50) return { side: 'sell', qty: pos }; // oversold relieved — take the rebound
  return null;
}
