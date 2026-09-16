/*
 * @coinsori-strategy v1
 * name: RSI Divergence Finder
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * This strategy identifies trade opportunities based on RSI divergence.
 * It buys when RSI shows bullish divergence and price is in oversold zone.
 * It sells when RSI shows bearish divergence and price is in overbought zone.
 * It does not work well during strong trends where divergence is rare.
 */

function onUpdate(ctx) {
  // 获取RSI指标
  const rsi = ctx.rsi(14);
  if (rsi == null) return null;

  // 获取价格数据
  const price = ctx.price;
  const closes = ctx.closes;

  // 检查RSI是否在超卖区域（<30）
  if (rsi < 30 && ctx.position === 0) {
    // 买入信号：价格创新低，但RSI没有创新低（看涨背离）
    const prevClose = closes[1];
    const prevRsi = ctx.rsi(14, 1); // 前一个周期的RSI
    if (prevClose != null && prevRsi != null) {
      if (price < prevClose && rsi > prevRsi) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
      }
    }
  }

  // 检查RSI是否在超买区域（>70）
  if (rsi > 70 && ctx.position > 0) {
    // 卖出信号：价格创新高，但RSI没有创新高（看跌背离）
    const prevClose = closes[1];
    const prevRsi = ctx.rsi(14, 1); // 前一个周期的RSI
    if (prevClose != null && prevRsi != null) {
      if (price > prevClose && rsi < prevRsi) {
        return { side: 'sell', qty: ctx.position };
      }
    }
  }

  // 持有仓位不操作
  return null;
}
