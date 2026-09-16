/*
 * @coinsori-strategy v1
 * name: MACD Crossover with Volume Filter
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * This strategy uses MACD crossover combined with a volume filter to identify trade entries.
 * It buys when MACD line crosses above signal line and volume is above average.
 * It sells when MACD line crosses below signal line.
 * It does not work well during low volatility periods or when volume is consistently low.
 */

function onUpdate(ctx) {
  // 获取MACD指标
  const macd = ctx.macd(12, 26, 9);
  if (macd == null || macd.macd == null || macd.signal == null) return null;

  // 获取当前价格和成交量
  const price = ctx.price;
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(10); // 10-period average volume

  // 检查是否满足成交量过滤器
  if (avgVol == null || vol <= avgVol) return null;

  // 买入信号：MACD线上穿信号线，且成交量大于平均水平
  if (macd.macd > macd.signal && ctx.position === 0) {
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }

  // 卖出信号：MACD线下穿信号线
  if (macd.macd < macd.signal && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }

  // 持有仓位不操作
  return null;
}
