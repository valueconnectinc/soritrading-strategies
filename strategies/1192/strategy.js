/*
 * @coinsori-strategy v1
 * name: BB RSI Trend-Filtered Mean Reversion
 * ex: binance
 * syms: ETHUSDT, BTCUSDT
 * interval: 4h
 * cash: 1000
 *
 * Mean reversion on Bollinger Band + RSI extremes, but ONLY when the broader
 * 4-hour trend agrees. A rising 30-EMA means the market is in an uptrend —
 * dips to the lower band with RSI oversold are buying opportunities WITHIN that
 * uptrend. A falling 30-EMA means downtrend — rallies to the upper band with
 * RSI overbought are shorting opportunities. This filter prevents the strategy
 * from fading strong trends.
 *
 * When it buys and sells: goes long when price touches the lower Bollinger Band,
 * RSI < 30, AND the 30-EMA is rising (uptrend). Exits on EMA crossover, RSI
 * extreme, or max hold. Shorts are the mirror (upper band + RSI > 70 + falling EMA).
 * When it does NOT work: in strong sustained trends, price hugs the outer band for
 * weeks — the strategy keeps getting stopped out or missing the move. Also fails
 * when the trend flips without warning.
 */

const BB_P     = 20;   // Bollinger Band period
const BB_K     = 2.0;  // Bollinger Band standard deviations
const RSI_P    = 14;   // RSI period
const ATR_P    = 14;   // ATR period for stops
const EMA_P    = 30;   // trend filter EMA period
const STOP_ATR = 2.5;  // stop distance in ATR units

const RSI_LONG_MAX   = 35;  // RSI must be below this to go long
const RSI_SHORT_MIN  = 65;  // RSI must be above this to go short
const RSI_EXIT_LONG  = 70;  // take profit if RSI normalizes here
const RSI_EXIT_SHORT = 30;  // take profit if RSI drops here

const MAX_BARS = 72;   // max hold (72 × 4 h ≈ 12 days)

let entryBar = 0;
let entryPx  = 0;

function onUpdate(ctx) {
  const pos   = ctx.position;
  const price = ctx.price;
  const i     = ctx.i;

  // --- Indicators ---
  const bb    = ctx.bb(BB_P, BB_K);
  const rsi   = ctx.rsi(RSI_P);
  const atr   = ctx.atr(ATR_P);
  const ema30 = ctx.ema(EMA_P);

  // EMA crossover for exit
  const emaFastNow  = ctx.ema(9,  0);
  const emaFastPrev = ctx.ema(9,  1);
  const emaSlowNow  = ctx.ema(30, 0);
  const emaSlowPrev = ctx.ema(30, 1);

  if (!bb || rsi == null || atr == null || ema30 == null) return null;
  if (emaFastNow == null || emaFastPrev == null || emaSlowNow == null || emaSlowPrev == null) return null;

  const { upper, middle, lower } = bb;
  const emaTrendUp   = ema30 > ctx.ema(EMA_P, 4);   // EMA rising over ~16 h
  const emaTrendDown = ema30 < ctx.ema(EMA_P, 4);   // EMA falling

  // EMA exit signals
  const bullCross = emaFastPrev <= emaSlowPrev && emaFastNow > emaSlowNow;
  const bearCross = emaFastPrev >= emaSlowPrev && emaFastNow < emaSlowNow;

  // === LONG: price at lower band + RSI oversold + uptrend ===
  if (price <= lower && rsi < RSI_LONG_MAX && emaTrendUp && pos === 0) {
    entryBar = i;
    entryPx  = price;
    return { side: 'buy', qty: ctx.cash / price * 0.99, comment: 'BB RSI long + EMA uptrend' };
  }

  // === SHORT: price at upper band + RSI overbought + downtrend ===
  if (price >= upper && rsi > RSI_SHORT_MIN && emaTrendDown && pos === 0) {
    entryBar = i;
    entryPx  = price;
    return { side: 'sell', qty: ctx.cash / price * 0.99, comment: 'BB RSI short + EMA downtrend' };
  }

  // === EXIT on EMA crossover ===
  if ((bullCross || bearCross) && pos !== 0) {
    entryBar = 0; entryPx = 0;
    return { side: 'sell', qty: Math.abs(pos), comment: 'EMA crossover exit' };
  }

  // === EXIT: RSI normalized (profit-taking) ===
  if (rsi > RSI_EXIT_LONG && pos > 0) {
    entryBar = 0; entryPx = 0;
    return { side: 'sell', qty: pos, comment: 'RSI normalized — exit long' };
  }
  if (rsi < RSI_EXIT_SHORT && pos < 0) {
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
