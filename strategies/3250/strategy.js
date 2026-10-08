/*
 * @coinsori-strategy v1
 * name: BTC 1D On-Chain Pure Trend
 * ex: binance
 * syms: BTC
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy:
 * Cleanest on-chain trend design: buy only when BOTH the price trend (200-day SMA)
 * and the network trend (30-day avg active addresses rising) agree, sell when the
 * price trend breaks. No RSI — the previous RSI entries/exits whipsawed. This holds
 * through the whole trend and only exits on a real trend break.
 * When it buys and sells:
 * Buys when price > 200-day SMA and 30-day avg active addresses is rising. Sells when
 * price closes below the 200-day SMA.
 * When it does NOT work:
 * In a bear market it stays out (good). Loses only if the 200-day SMA gives a false
 * break near a range top (whipsaw) or if price trends up while addresses already
 * peaked — the on-chain signal lags the top. Misses fast breakouts with no pullback.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const addrSma = ctx.data('addr_sma30');
  const sma200 = ctx.sma(200, 1);
  if (price == null || addrSma == null || sma200 == null) return null;

  const prevAddrSma = ctx.state.prevAddrSma;
  ctx.state.prevAddrSma = addrSma;
  const networkGrowing = prevAddrSma != null && addrSma > prevAddrSma;

  const inUptrend = price > sma200;

  if (ctx.position > 0) {
    if (!inUptrend) {
      return { side: 'sell', qty: ctx.position };
    }
    return null;
  }

  if (inUptrend && networkGrowing) {
    return { side: 'buy', qty: ctx.cash / price * 0.95 };
  }
  return null;
}
