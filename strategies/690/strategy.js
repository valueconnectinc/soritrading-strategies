/*
 * @coinsori-strategy v1
 * name: MACD Trend Filter Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses the MACD indicator to filter trends, aiming to avoid trades during weak or unclear trends. It seeks to capitalize only on strong momentum moves.
 * When it buys and sells: It buys when the MACD line crosses above the signal line in an upward trend and sells when it crosses below in a downward trend — but only if the trend is confirmed by the MACD histogram.
 * When it does NOT work: This strategy may underperform in ranging markets where trends are unclear, leading to missed opportunities and reduced trading frequency.
 */

function onUpdate(ctx) {
  // Get MACD values with ago=1 for previous bar
  const macd = ctx.macd(12, 26, 9, 1);
  const macdPrev = ctx.macd(12, 26, 9, 2);

  if (macd == null || macdPrev == null || macd.signal == null || macdPrev.signal == null) {
    return null;
  }

  // Trend confirmation using MACD histogram
  const hist = macd.macd - macd.signal;
  const histPrev = macdPrev.macd - macdPrev.signal;

  // Buy condition: MACD line crosses above signal line and histogram is positive (strong upward momentum)
  if (macdPrev.macd <= macdPrev.signal && macd.macd > macd.signal && hist > 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Sell condition: MACD line crosses below signal line and histogram is negative (strong downward momentum)
  if (macdPrev.macd >= macdPrev.signal && macd.macd < macd.signal && hist < 0) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
