/*
 * @coinsori-strategy v1
 * name: BTC Fear-Greed Trend Dip-Buy 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: pure contrarian Fear & Greed buying failed because extreme
 * fear in crypto means an ongoing crash (knife-catching). This variant flips the
 * logic: only buy a pullback when the trend is still UP (price above SMA50) and
 * sentiment is not euphoric — a "buy the dip in an uptrend" that uses the Fear
 * & Greed index to time entries but respects the trend. Exit when the trend
 * breaks or the crowd turns euphoric.
 * When it buys and sells: buys when price is above the 50-day average AND the
 * sentiment index is below 45 (a fearful pullback, not a top); sells when price
 * falls below the 50-day average or the index exceeds 75.
 * When it does NOT work: in a choppy sideways market SMA50 whipsaws and the
 * dip-buys get stopped out repeatedly; and it sits flat in strong bear markets
 * (never catching the bottom) so it underperforms a pure buy-and-hold in a
 * straight-line bull run with no fearful pullbacks.
 */
function onUpdate(ctx) {
  const fg = ctx.data('fear_greed');
  if (fg == null) return null;

  const sma50 = ctx.sma(50);
  if (sma50 == null) return null;

  const lastExit = ctx.state.lastExit || -9999;
  const cooldownOk = (ctx.i - lastExit) >= 5; // 5-bar wait after each exit

  const uptrend = ctx.price > sma50;
  const notEuphoric = fg < 45; // a fearful pullback, not a euphoric top

  // BUY: uptrend intact + fearful pullback + cooldown + flat
  if (uptrend && notEuphoric && cooldownOk && ctx.position === 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  const trendBroke = ctx.price < sma50;
  const euphoric = fg > 75;

  // SELL: trend broke or crowd euphoric
  if (ctx.position > 0 && (trendBroke || euphoric)) {
    ctx.state.lastExit = ctx.i;
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
