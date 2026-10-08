/*
 * @coinsori-strategy v1
 * name: SOL 4H EMA Trend + ATR Size
 * ex: binance
 * syms: SOL
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: In strong crypto uptrends, price tends to ride the 50-EMA while pullbacks to it get bought. Betting that a clean trend-following signal on 4H captures sustained moves.
 * When it buys and sells: Buys when the fast EMA crosses above the slow EMA and price is above the 200-EMA (trend filter). Sells when the fast EMA crosses back below the slow EMA (trend over). Position size scales down as volatility rises so a single crash doesn't wipe the account.
 * When it does NOT work: In choppy sideways markets the EMA cross whipsaws between buys and sells, paying fees each time. It also lags sharp reversals, so a sudden top gives back gains before the exit triggers.
 */
function onUpdate(ctx) {
  const fast = ctx.ema(20, 1);
  const slow = ctx.ema(50, 1);
  const trend = ctx.ema(200, 1);
  const f2 = ctx.ema(20, 2);
  const s2 = ctx.ema(50, 2);
  const atr = ctx.atr(14, 1);
  if (fast == null || slow == null || trend == null || f2 == null || s2 == null || atr == null) return null;
  const price = ctx.price;

  // Scale position down as ATR grows: use 2% of cash as risk per unit of ATR.
  const riskPerTrade = 0.02 * ctx.cash;
  const qty = riskPerTrade / atr;

  // Trend filter: only trade when price is above the long EMA (bull regime).
  const inUptrend = price > trend;

  if (ctx.position === 0) {
    if (inUptrend && s2 <= f2 && slow < fast) {
      return { side: 'buy', qty };
    }
    return null;
  }

  // Exit when the fast EMA crosses back below the slow EMA.
  if (s2 >= f2 && slow > fast) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
