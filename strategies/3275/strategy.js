/*
 * @coinsori-strategy v1
 * name: Dip Mean Reversion
 * ex: binance
 * syms: BTC
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: In an established uptrend, sharp dips to the lower Bollinger
 * band tend to snap back to the middle band. Buying these dips with a hard stop
 * limits downside while capturing the reversion.
 * When it buys and sells: Buys when the last CLOSED bar is below the lower Bollinger
 * band while price stays above the 200-day EMA (trend intact). Sells when price
 * returns to the middle band, hits a 2.5x ATR stop, or is held too long (30 days).
 * When it does NOT work: In a strong downtrend price stays below the middle band and
 * the stop is hit repeatedly. Also fails in dead flat markets with no dips to trade.
 */
function onUpdate(ctx) {
  const bbN = 20, bbK = 2, trendN = 200, stopMult = 2.5, atrN = 14, maxHold = 30;
  const price = ctx.price;
  const pos = ctx.position;

  const prevClose = ctx.closes.at(-2);
  const bb1 = ctx.bb(bbN, bbK, 1);
  const ema200_1 = ctx.ema(trendN, 1);
  const atr = ctx.atr(atrN);
  if (prevClose == null || bb1 == null || ema200_1 == null || atr == null) return null;

  if (pos === 0) {
    ctx.watch([{ side:'buy', price: bb1.lower, trigger:'below', note:'BB lower dip', conds:[
      { label:'price > EMA200', ok: prevClose > ema200_1 }
    ]}]);
    if (prevClose < bb1.lower && prevClose > ema200_1) {
      entryBar = ctx.i;
      return { side:'buy', qty: ctx.cash / price * 0.99 };
    }
    return null;
  }

  const stopPx = ctx.entryPx - stopMult * atr;
  const mid = bb1.middle; // mean-reversion target = 20-day moving average
  const held = ctx.i - (entryBar == null ? ctx.i : entryBar);
  ctx.watch([
    { side:'sell', price: mid, trigger:'above', note:'mean target' },
    { side:'sell', price: stopPx, trigger:'below', note:'hard stop' },
    { side:'sell', at: (ctx.candle?.t||0) + (maxHold - held) * 86400, note:'time stop' }
  ]);
  if (price <= stopPx) return { side:'sell', qty: pos };
  if (price >= mid) return { side:'sell', qty: pos };
  if (held >= maxHold) return { side:'sell', qty: pos };
  return null;
}
let entryBar = null;
