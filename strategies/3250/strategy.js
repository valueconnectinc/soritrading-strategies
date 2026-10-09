/*
 * @coinsori-strategy v1
 * name: BTC 4H Classic 200-SMA Trend Following
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: the simplest robust trend filter — when price stays above
 * its 200-bar average (a ~33-day trend on 4h bars) the market is in an uptrend
 * and holding captures it; when price closes below, the trend is broken and cash
 * protects capital. Few trades mean low fee drag, unlike a tight trailing stop.
 * When it buys and sells: buys when price closes above the 200-SMA, sells when
 * it closes back below the 200-SMA.
 * When it does NOT work: in a choppy sideways market price oscillates around the
 * 200-SMA and every crossing is a small loss; it also lags the very start and end
 * of strong trends (buys late, sells late) and never short-sells a bear market.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma200 = ctx.sma(200, 1); // closed bar -> identical in backtest, paper and live
  if (sma200 == null) return null;

  if (pos > 0 && price < sma200) {
    return { side: 'sell', qty: pos };
  }
  if (pos === 0 && price > sma200) {
    return { side: 'buy', qty: ctx.cash / price * 0.95 };
  }
  ctx.watch([{ side: 'buy', price: sma200, note: '200-SMA (long)' },
             { side: 'sell', price: sma200, note: '200-SMA (exit)' }]);
  return null;
}
