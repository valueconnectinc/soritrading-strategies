/*
 * @coinsori-strategy v1
 * name: SOL 4H Keltner Mean Reversion
 * ex: binance
 * syms: SOL
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: SOL frequently over-extends from its short-term mean and snaps back. On 4h, mean reversion has shown promise while trend-following has failed.
 * When it buys and sells: Buys when price dips below a Keltner lower band (EMA20 - k*ATR) with RSI oversold; sells when price reaches the upper band target or hits a stop.
 * When it does NOT work: In strong one-directional trends (sustained bull run or crash), price can stay below the lower band for long stretches and never mean-revert — this loses to buy-and-hold in those regimes.
 */
function onUpdate(ctx) {
  const ema = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const rsi = ctx.rsi(14, 1);
  const price = ctx.price;
  if (ema == null || atr == null || rsi == null) return null;

  const k = 2.5; // band width: 2.5x ATR captures genuine over-extension without too many whipsaws
  const lower = ema - k * atr;
  const upper = ema + k * atr;

  ctx.watch([
    { side: 'buy', price: lower, note: 'Keltner lower band' },
    { side: 'sell', price: upper, note: 'upper target' }
  ]);

  // Exit: sell at upper band target or 3xATR stop below entry
  if (ctx.position > 0) {
    const stopPx = ctx.entryPx - 3 * atr; // hard stop: 3xATR below entry caps a bad reversion
    if (price >= upper || price <= stopPx) {
      return { side: 'sell', qty: ctx.position };
    }
    return null;
  }

  // Entry: buy when previous close pierced below the lower band AND RSI is oversold (<35)
  const rsiPrev = ctx.rsi(14, 2);
  if (rsiPrev == null) return null;
  if (rsi < 35 && ctx.closes[ctx.closes.length-2] <= lower) {
    return { side: 'buy', qty: ctx.cash / price * 0.95 };
  }
  return null;
}
