/*
 * @coinsori-strategy v1
 * name: EMA Momentum RSI Confirmation
 * ex: binance
 * syms: ETHUSDT, BTCUSDT
 * interval: 4h
 * cash: 1000
 *
 * EMA crossover trend-following strategy. Buys when the fast EMA crosses above
 * the slow EMA and RSI confirms momentum is not overbought; sells when the fast
 * EMA crosses back below or RSI reaches overbought territory. ATR sets a
 * volatility-adjusted stop loss. A time-based exit prevents holding through
 * choppy, directionless stretches.
 *
 * When it buys and sells: enters long on EMA bullish crossover (fast crosses above
 * slow) with RSI below 70; exits on EMA bearish crossover or RSI above 80.
 * When it does NOT work: ranges sideways — EMA crossovers whipsaw in tight markets
 * and generate small losses repeatedly. Also fails when trends reverse quickly
 * before the crossover fires.
 */

// --- Parameters ---
const FAST       = 10;   // fast EMA period
const SLOW       = 30;   // slow EMA period — defines the dominant trend
const RSI_P      = 14;   // RSI period
const ATR_P      = 14;   // ATR period — measures true range for stops
const STOP_ATR   = 2.0;  // stop distance in ATR units
const RSI_LONG_MAX = 70; // RSI must be below this to enter long
const RSI_EXIT   = 80;   // RSI above this triggers profit-taking exit
const MAX_BARS   = 48;   // max hold time (48 × 4 h ≈ 8 days)

// --- Persistent state (survives between onUpdate calls) ---
let entryBar = 0;   // bar index when we entered; 0 = no position
let entryPx  = 0;   // price when we entered

function onUpdate(ctx) {
  const pos   = ctx.position;   // > 0 = long, 0 = flat
  const price = ctx.price;
  const i     = ctx.i;          // current bar index

  // --- Indicators ---
  const fastNow  = ctx.ema(FAST, 0);
  const fastPrev = ctx.ema(FAST, 1);
  const slowNow  = ctx.ema(SLOW, 0);
  const slowPrev = ctx.ema(SLOW, 1);
  const rsiNow   = ctx.rsi(RSI_P);
  const atr      = ctx.atr(ATR_P);

  if (fastNow == null || slowNow == null || rsiNow == null || atr == null) return null;

  // --- EMA Crossover signals ---
  // Bullish: fast was at/below slow, now above
  const bullCross = fastPrev <= slowPrev && fastNow > slowNow;
  // Bearish: fast was at/above slow, now below
  const bearCross = fastPrev >= slowPrev && fastNow < slowNow;

  // --- Entry: Long on bullish EMA crossover + RSI confirming ---
  if (bullCross && rsiNow < RSI_LONG_MAX && pos === 0) {
    entryBar = i;
    entryPx  = price;
    return {
      side: 'buy',
      qty: ctx.cash / price * 0.99,
      comment: 'EMA bullish cross + RSI confirm'
    };
  }

  // --- Exit on bearish EMA crossover ---
  if (bearCross && pos > 0) {
    entryBar = 0;
    entryPx  = 0;
    return { side: 'sell', qty: ctx.position, comment: 'EMA bearish cross — exit' };
  }

  // --- RSI overbought: take profit early ---
  if (rsiNow > RSI_EXIT && pos > 0) {
    entryBar = 0;
    entryPx  = 0;
    return { side: 'sell', qty: ctx.position, comment: 'RSI overbought — exit' };
  }

  // --- Time-based exit: close if held too long ---
  if (entryBar > 0 && (i - entryBar) >= MAX_BARS) {
    entryBar = 0;
    entryPx  = 0;
    return { side: 'sell', qty: ctx.position, comment: 'Max hold time reached' };
  }

  // --- Hard stop: exit if price drops STOP_ATR × ATR below entry ---
  if (entryPx > 0 && price < entryPx - STOP_ATR * atr) {
    entryBar = 0;
    entryPx  = 0;
    return { side: 'sell', qty: ctx.position, comment: 'ATR hard stop' };
  }

  return null;
}
