/*
 * @coinsori-strategy v1
 * name: Bollinger Band Mean Reversion
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * This strategy uses Bollinger Bands to detect mean reversion opportunities. When the price touches the lower band,
 * it's a buy signal; when it touches the upper band, it's a sell signal.
 * It buys when price touches the lower band and sells when it touches the upper band.
 * It does not work well in strong trending markets where price stays consistently above or below the bands.
 */

function onUpdate(ctx) {
  // 获取布林带指标
  const bb = ctx.bb(20, 2); // 20 period, 2 standard deviations
  if (bb == null) return null;

  // 获取当前价格和布林带值
  const price = ctx.price;
  const lowerBand = bb.lower;
  const upperBand = bb.upper;

  // 买入信号：价格触及下轨
  if (price <= lowerBand && ctx.position === 0) {
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }

  // 卖出信号：价格触及上轨
  if (price >= upperBand && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }

  // 持有仓位不操作
  return null;
}
