/*
 * @coinsori-strategy v1
 * name: BTC 1D On-Chain Trend (clean)
 * ex: binance
 * syms: BTC
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy:
 * On-chain network activity (active BTC addresses) leads price. When the 30-day
 * average of active addresses is rising AND price is above its 200-day average,
 * the network is growing in a confirmed uptrend. This clean trend design holds
 * through pullbacks — no RSI whipsaw — so it captures the full trend and exits
 * only when the trend or overbought condition breaks.
 * When it buys and sells:
 * Buys when 30-day avg active addresses is rising, price > 200-day SMA, and RSI<45
 * (a dip inside the trend). Sells when price closes below the 200-day SMA (trend break)
 * or RSI reaches 70 (overbought).
 * When it does NOT work:
 * In a bear market the 200-day SMA keeps it out. If addresses keep rising but price
 * already peaked, the signal lags the top and the RSI70 exit gives back gains. It
 * misses fast breakouts with no pullback — the trend must dip to enter.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const addrSma = ctx.data('addr_sma30');
  const sma200 = ctx.sma(200, 1);
  const rsi = ctx.rsi(14, 1);
  if (price == null || addrSma == null || sma200 == null || rsi == null) return null;

  // Track previous bar's addr_sma30 to detect "rising"
  const prevAddrSma = ctx.state.prevAddrSma;
  ctx.state.prevAddrSma = addrSma;

  const inUptrend = price > sma200;
  const networkGrowing = prevAddrSma != null && addrSma > prevAddrSma; // 30d avg rising

  if (ctx.position > 0) {
    if (!inUptrend || rsi >= 70) {
      ctx.state.lastExitBar = ctx.i;
      return { side: 'sell', qty: ctx.position };
    }
    return null;
  }

  if (ctx.state.lastExitBar != null && ctx.i - ctx.state.lastExitBar < 3) return null;

  if (inUptrend && networkGrowing && rsi < 45) {
    return { side: 'buy', qty: ctx.cash / price * 0.95 };
  }
  return null;
}
