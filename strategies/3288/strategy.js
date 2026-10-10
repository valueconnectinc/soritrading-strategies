/*
 * @coinsori-strategy v1
 * name: ETH BB-RSI Mean Reversion 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Mean reversion — sharp drops to the Bollinger lower band with
 * an oversold RSI are usually overreactions, and ETH tends to snap back toward its
 * average. On 4h this fires far more often than on 1d and catches local panics
 * instead of waiting months for a daily flush. The 200-bar SMA gate (≈33 days on
 * 4h) keeps us out of confirmed bear regimes.
 * When it buys and sells: Buys when price closes below the 20-bar Bollinger lower
 * band AND RSI(14) is oversold (<30) AND price is above its 200-bar SMA. Sells
 * when price returns to the Bollinger middle, RSI recovers above 50, or on a hard
 * 2x ATR stop. Full position — mean reversion only pays when you commit.
 * When it does NOT work: In a sustained downtrend the lower band keeps getting hit
 * and the "snap-back" never comes; the 200-bar gate lags the breakdown. Also
 * whipsaws in choppy ranges cause repeated small losses.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const pos = ctx.position;
  if (!Number.isFinite(price) || price <= 0) return null;

  // All signals from CLOSED bars so backtest, paper and live are identical.
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const atr = ctx.atr(14, 1);
  const sma200 = ctx.sma(200, 1);
  if (bb == null || rsi == null || atr == null || sma200 == null) return null;
  if (bb.lower == null || bb.mid == null) return null;

  const touch = price < bb.lower;
  const oversold = rsi < 30;
  const trendOk = price > sma200;

  if (pos === 0) {
    ctx.watch([{ side: 'buy', price: bb.lower, trigger: 'below', note: 'BB lower touch',
      conds: [{ label: 'RSI(14) < 30', now: rsi, op: '<', ref: 30, closed: true },
              { label: 'price > 200 SMA', ok: price > sma200 }] }]);
    if (touch && oversold && trendOk && atr > 0) {
      return { side: 'buy', qty: ctx.cash / price * 0.95 };
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
