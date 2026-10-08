/*
 * @coinsori-strategy v1
 * name: BTC 1D On-Chain Trend Fast Exit
 * ex: binance
 * syms: BTC
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy:
 * On-chain network growth (30-day avg active addresses rising) confirms an uptrend.
 * The previous version exited on a 200-day SMA break, which was too slow and gave
 * back gains in the recent window. This version exits on the faster EMA50 break to
 * lock in trends earlier while keeping the on-chain growth entry filter.
 * When it buys and sells:
 * Buys when price > 200-day SMA and 30-day avg active addresses rising. Sells when
 * price closes below the 50-day EMA.
 * When it does NOT work:
 * A faster exit whipsaws in choppy ranges — EMA50 breaks happen often. It misses
 * fast breakouts with no pullback and can re-enter late after a dip.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const addrSma = ctx.data('addr_sma30');
  const sma200 = ctx.sma(200, 1);
  const ema50 = ctx.ema(50, 1);
  if (price == null || addrSma == null || sma200 == null || ema50 == null) return null;

  const prevAddrSma = ctx.state.prevAddrSma;
  ctx.state.prevAddrSma = addrSma;
  const networkGrowing = prevAddrSma != null && addrSma > prevAddrSma;

  const inUptrend = price > sma200;

  if (ctx.position > 0) {
    if (price < ema50) {
      return { side: 'sell', qty: ctx.position };
    }
    return null;
  }

  if (inUptrend && networkGrowing) {
    return { side: 'buy', qty: ctx.cash / price * 0.95 };
  }
  return null;
}
