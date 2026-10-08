/*
 * @coinsori-strategy v1
 * name: BTC 1D On-Chain Network Growth Trend
 * ex: binance
 * syms: BTC
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy:
 * On-chain network activity (active BTC addresses) leads price. When active addresses
 * rise above their 30-day average while price is above its 200-day average, the network
 * is growing in a confirmed uptrend — a fundamentally different signal family than
 * mean reversion or sentiment. Bet on adoption growth, not on wiggles.
 * When it buys and sells:
 * Buys on a dip inside an uptrend (price > 200-day SMA, active addresses > 30-day avg,
 * RSI < 50). Sells when price closes below the 200-day SMA or active addresses fall
 * below their 30-day average (network shrinking = exit).
 * When it does NOT work:
 * In a bear market the 200-day SMA keeps it out (good). In a bull market with a
 * brief address-data irregularity it can whipsaw. If addresses keep rising but price
 * already peaked, the signal lags the top. It misses fast breakouts with no pullback.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const addr = ctx.data('addr');
  const addrSma = ctx.data('addr_sma30');
  const sma200 = ctx.sma(200, 1);
  const rsi = ctx.rsi(14, 1);
  if (price == null || addr == null || addrSma == null || sma200 == null || rsi == null) return null;

  const inUptrend = price > sma200;
  const networkGrowing = addr > addrSma; // active addresses above their 30-day average

  if (ctx.position > 0) {
    // Exit on trend break or network shrink
    if (!inUptrend || !networkGrowing) {
      ctx.state.lastExitBar = ctx.i;
      return { side: 'sell', qty: ctx.position };
    }
    // Take profit when RSI reaches overbought
    if (rsi >= 65) {
      ctx.state.lastExitBar = ctx.i;
      return { side: 'sell', qty: ctx.position };
    }
    return null;
  }

  if (ctx.state.lastExitBar != null && ctx.i - ctx.state.lastExitBar < 3) return null;

  // Dip inside confirmed uptrend with growing network
  if (inUptrend && networkGrowing && rsi < 50) {
    return { side: 'buy', qty: ctx.cash / price * 0.95 };
  }
  return null;
}
