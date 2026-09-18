/*
 * @coinsori-strategy v1
 * name: RSI Band Mean Reversion
 * ex: binance
 * syms: BTCUSDT, ETHUSDT
 * interval: 4h
 * cash: 1000
 *
 * Simpler than the trend-filtered version: pure RSI mean reversion with Bollinger
 * Bands and ATR stops. Goes long when RSI < 30 (price near lower band) and exits
 * when RSI > 65 or on EMA crossover. No trend filter — this version tests whether
 * BTC responds to a simpler signal without the EMA trend condition blocking entries.
 *
 * When it buys and sells: buys when RSI drops below 30 and price is at/below the
 * lower Bollinger Band; sells when RSI rises above 65 or the 9/30 EMA crosses down.
 * When it does NOT work: in strong downtrends where RSI stays "oversold" for weeks.
 * RSI can remain depressed in bear markets — this strategy keeps buying into a
 * falling knife.
 */

const BB_P     = 20;
const BB_K     = 2.0;
const RSI_P    = 14;
const ATR_P    = 14;
const STOP_ATR = 2.0;

const RSI_LONG_ENTRY  = 30;  // oversold — buy signal
const RSI_LONG_EXIT   = 65;  // RSI normalized — take profit
const RSI_SHORT_ENTRY = 70; // overbought — short signal
const RSI_SHORT_EXIT  = 35; // RSI normalized — take profit short

const MAX_BARS = 60;  // max hold (60 × 4 h = 10 days)

let entryBar = 0;
let entryPx  = 0;

function onUpdate(ctx) {
  const pos   = ctx.position;
  const price = ctx.price;
  const i     = ctx.i;

  const bb  = ctx.bb(BB_P, BB_K);
  const rsi = ctx.rsi(RSI_P);
  const atr = ctx.atr(ATR_P);

  const emaFastNow  = ctx.ema(9,  0);
  const emaFastPrev = ctx.ema(9,  1);
  const emaSlowNow  = ctx.ema(30, 0);
  const emaSlowPrev = ctx.ema(30, 1);

  if (!bb || rsi == null || atr == null) return null;
  if (emaFastNow == null || emaFastPrev == null || emaSlowNow == null || emaSlowPrev == null) return null;

  const { upper, lower } = bb;

  // EMA exit signals
  const bullCross = emaFastPrev <= emaSlowPrev && emaFastNow > emaSlowNow;
  const bearCross = emaFastPrev >= emaSlowPrev && emaFastNow < emaSlowNow;

  // === LONG: RSI oversold + price at/near lower band ===
  if (rsi < RSI_LONG_ENTRY && price <= lower && pos === 0) {
    entryBar = i;
    entryPx  = price;
    return { side: 'buy', qty: ctx.cash / price * 0.99, comment: 'RSI oversold + lower band' };
  }

  // === SHORT: RSI overbought + price at/near upper band ===
  if (rsi > RSI_SHORT_ENTRY && price >= upper && pos === 0) {
    entryBar = i;
    entryPx  = price;
    return { side: 'sell', qty: ctx.cash / price * 0.99, comment: 'RSI overbought + upper band' };
  }

  // === EXIT on EMA crossover ===
  if ((bullCross || bearCross) && pos !== 0) {
    entryBar = 0; entryPx = 0;
    return { side: 'sell', qty: Math.abs(pos), comment: 'EMA crossover exit' };
  }

  // === EXIT: RSI normalized ===
  if (rsi > RSI_LONG_EXIT && pos > 0) {
    entryBar = 0; entryPx = 0;
    return { side: 'sell', qty: pos, comment: 'RSI normalized — exit long' };
  }
  if (rsi < RSI_SHORT_EXIT && pos < 0) {
    entryBar = 0; entryPx = 0;
    return { side: 'sell', qty: Math.abs(pos), comment: 'RSI normalized — exit short' };
  }

  // === Time-based exit ===
  if (entryBar > 0 && (i - entryBar) >= MAX_BARS) {
    entryBar = 0; entryPx = 0;
    return { side: 'sell', qty: Math.abs(pos), comment: 'Max hold reached' };
  }

  // === ATR hard stop ===
  if (entryPx > 0) {
    if (pos > 0 && price < entryPx - STOP_ATR * atr) {
      entryBar = 0; entryPx = 0;
      return { side: 'sell', qty: pos, comment: 'ATR stop loss' };
    }
    if (pos < 0 && price > entryPx + STOP_ATR * atr) {
      entryBar = 0; entryPx = 0;
      return { side: 'buy', qty: Math.abs(pos), comment: 'ATR stop loss' };
    }
  }

  return null;
}
