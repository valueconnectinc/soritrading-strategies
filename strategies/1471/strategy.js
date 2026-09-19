/*
 * @coinsori-strategy v1
 * name: EMA Cross + RSI Momentum Filter
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: EMA(9) crossing above EMA(21) in an established uptrend catches
 * directional momentum without MACD's lag. RSI filter keeps us out of overextended
 * moves. ATR confirms volatility is expanding, reducing false breakout whipsaws.
 * When it buys and sells: Buy when EMA9 crosses above EMA21, RSI is between 40-65
 * (not yet overbought), and ATR is rising (volatility expanding). Sell when RSI
 * exceeds 65 (momentum exhausting) or EMA9 crosses back below EMA21.
 * When it does NOT work: In choppy markets where EMAs cross repeatedly (whipsaws),
 * and in strong single-direction moves where the RSI filter prevents entry.
 */
function onUpdate(ctx) {
  const ema9  = ctx.ema(9);
  const ema21 = ctx.ema(21);
  const ema50 = ctx.ema(50);
  const rsi   = ctx.rsi(14);
  const atr   = ctx.atr(14);

  if (ema9 == null || ema21 == null || ema50 == null || rsi == null || atr == null) return null;

  const atrPrev = ctx.atr(14, 1);
  if (atrPrev == null) return null;

  // EMA crossover: EMA9 crosses above EMA21 (bullish momentum)
  const ema9Above21    = ema9 > ema21;
  const ema9Above21Prev = ctx.ema(9, 1) > ctx.ema(21, 1);
  const emaBullCross   = ema9Above21 && !ema9Above21Prev;

  // EMA crossover: EMA9 crosses below EMA21 (bearish momentum / exit)
  const emaBearCross   = !ema9Above21 && ema9Above21Prev;

  // Broader uptrend: price above EMA50
  const trendUp = ctx.price > ema50;

  // RSI in sweet spot: 40-65 (confirms momentum without being overbought)
  const rsiConfirm = rsi > 40 && rsi < 65;

  // ATR expanding (volatility confirming the move)
  const atrExpanding = atr > atrPrev;

  // Entry: EMA bullish cross + trend + RSI confirm + ATR expanding
  if (ctx.position === 0 && emaBullCross && trendUp && rsiConfirm && atrExpanding) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Exit: EMA bearish cross OR RSI overbought (>65)
  if (ctx.position > 0) {
    if (emaBearCross || rsi > 65) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
