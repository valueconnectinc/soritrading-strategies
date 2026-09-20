/*
 * @coinsori-strategy v1
 * name: BTC RSI Mean Reversion 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: crypto prices often overreact and snap back. When a short-term
 * sell-off pushes RSI into oversold territory, a bounce is more likely than a crash,
 * so we buy the dip and sell the rip.
 * When it buys and sells: it buys when RSI drops below 30 (oversold) and price is
 * still above the long trend line (so we are not catching a real crash), and sells
 * when RSI climbs back above 70 (overbought) or price falls below the trend line.
 * When it does NOT work: in a strong one-way crash the trend filter is too slow and
 * the dip keeps dipping; and in a dead-flat market RSI rarely reaches 30/70 so the
 * strategy just sits in cash.
 */
function onUpdate(ctx) {
  const rsi = ctx.rsi(14, 1);
  const rsiP = ctx.rsi(14, 2);
  const sma = ctx.sma(200, 1);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  if (rsi == null || rsiP == null || sma == null || closePrev == null) return null;

  const pos = ctx.position;
  const price = ctx.price;

  if (pos <= 0) {
    // Buy when RSI crosses up out of oversold AND price still above the long trend.
    if (rsiP < 30 && rsi >= 30 && closePrev > sma) {
      return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
    }
    return null;
  } else {
    // Exit on overbought, or if the trend breaks (capital protection).
    if (rsi >= 70 || closePrev < sma) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
