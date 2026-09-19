/*
 * @coinsori-strategy v1
 * name: ATR Channel Breakout Momentum
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: ATR channels adapt to SOL's high and variable volatility —
 * unlike fixed-percentage bands, a 1× ATR channel naturally widens when SOL moves
 * fast and tightens when it ranges. This avoids the whipsaw problem that plagued
 * fixed-stop EMA cross strategies.
 * When it buys and sells: Entry when price closes above EMA20 by more than 1× ATR
 * (genuine breakout, not noise) with RSI confirming momentum above 50. Exit when
 * price falls below EMA20 by 0.5× ATR or RSI drops below 40.
 * When it does NOT work: In choppy range-bound markets where price oscillates around
 * EMA20 repeatedly — each oscillation triggers a stop even if the channel widens.
 */
function onUpdate(ctx) {
  // Indicators
  const ema20 = ctx.ema(20);
  const rsi   = ctx.rsi(14);
  const atr   = ctx.atr(14);

  if (ema20 == null || rsi == null || atr == null) return null;

  const price   = ctx.price;
  const inPos    = ctx.position > 0;
  const flat     = ctx.position === 0;

  // ATR channel levels (dynamic — widen with volatility)
  const upper = ema20 + atr;       // breakout threshold: price must clear this
  const lower = ema20 - 0.5 * atr; // exit threshold: price falls below this

  // Trend: price above EMA20 = bull phase
  const bullPhase = price > ema20;

  // Entry: price breaks above upper ATR channel + RSI confirms (no entries below EMA)
  // Require flat (no double-entry) and RSI not overbought
  const entrySignal = flat && price > upper && rsi > 50 && rsi < 80 && bullPhase;

  if (entrySignal) {
    // Stop: below EMA20 by 0.5× ATR — wide enough to survive normal pullbacks
    const sl = ema20 - 0.5 * atr;
    return {
      side: 'buy',
      qty: ctx.cash / price * 0.98,
      type: 'limit',
      price: price,
      postOnly: true,
      trigger: { side: 'sell', type: 'stop', price: sl }
    };
  }

  // Exit: price falls below lower ATR channel (EMA20 - 0.5×ATR) OR RSI weak
  const exitSignal = inPos && (price < lower || rsi < 40);

  if (exitSignal) {
    return { side: 'sell', qty: ctx.position, type: 'market' };
  }

  return null;
}
