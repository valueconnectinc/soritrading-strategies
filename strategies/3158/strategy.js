/*
 * BTC Trend + Sentiment Top-Detector 1D
 * Idea: BTC's biggest drawdowns start from euphoric tops (2017, 2021 both had
 * FearGreed > 85). So: ride the 200-SMA uptrend, but SELL into euphoria instead
 * of holding to the very top — exit when crowd greed is extreme.
 */
function onUpdate(ctx) {
  const fg = ctx.data('fear_greed');
  if (fg == null) return null; // sentiment data unknown -> no trade

  const price = ctx.price;
  const sma200 = ctx.sma(200, 1); // closed bars -> same in backtest/live
  if (sma200 == null) return null;

  const holding = ctx.position > 0;
  const trendUp = price > sma200;

  if (!holding) {
    if (trendUp && fg < 80) { // long only in uptrend and NOT at euphoria top
      ctx.watch([{ side: 'buy', price: price, note: 'trend up, no euphoria' }]);
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
    return null;
  }

  // exit on extreme greed (euphoria top) OR trend break
  if (fg > 85 || !trendUp) {
    ctx.watch([{ side: 'sell', price: price, note: 'euphoria / trend break' }]);
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
