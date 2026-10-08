/*
 * @coinsori-strategy v1
 * name: SOL 4H Keltner Mean Reversion
 * ex: binance
 * syms: SOL
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: SOL frequently over-extends from its short-term mean and snaps back. On 4h, mean reversion has shown promise while trend-following has failed.
 * When it buys and sells: Buys when price dips below a Keltner lower band (EMA20 - k*ATR) with RSI oversold; sells when price returns to the mid-band EMA20 or the trade hits a stop.
 * When it does NOT work: In strong one-directional trends (like a sustained bull run or crash), price can stay below the lower band for long stretches and never mean-revert — this loses to buy-and-hold in those regimes.
 */
function onUpdate(ctx) {
  const ema = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const rsi = ctx.rsi(14, 1);
  const price = ctx.price;
  if (ema == null || atr == null || rsi == null) return null;

  const k = 2.5; // band width: 2.5x ATR captures genuine over-extension without too many whipsaws
  const lower = ema - k * atr;

  ctx.watch([
    { side: 'buy', price: lower, note: 'Keltner lower band' },
    { side: 'sell', price: ema, note: 'mid-band target' }
  ]);

  // Exit: if in position, sell when price returns to mid-band (EMA20) or hits a 3xATR stop
  if (ctx.position > 0) {
    const stopPx = ctx.entryPx - 3 * atr; // hard stop: 3xATR below entry caps a bad reversion
    if (price >= ema || price <= stopPx) {
      return { side: 'sell', qty: ctx.position };
    }
    return null;
  }

  // Entry: buy when price pierces below the lower band AND RSI is oversold (<35)
  const rsiPrev = ctx.rsi(14, 2);
  if (rsiPrev == null) return null;
  // require RSI<35 for oversold confirmation; use previous close to avoid live-bar noise
  if (rsi < 35 && ctx.closes[ctx.closes.length-2] <= lower) {
    return { side: 'buy', qty: ctx.cash / price * 0.95 };
  }
  return null;
}
