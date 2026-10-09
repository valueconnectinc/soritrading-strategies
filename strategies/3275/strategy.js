/*
 * @coinsori-strategy v1
 * name: RSI2 Fast Mean Reversion
 * ex: binance
 * syms: BTC
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: On daily bars, ultra-short-term RSI(2) below 5 marks a panic
 * flush that, inside a confirmed uptrend, usually reverts within a few days —
 * the Connors RSI(2) mean-reversion bet on crypto.
 * When it buys and sells: Buys when RSI(2) < 5 on a closed bar while price is above
 * the 200-day EMA (trend intact). Sells when RSI(2) climbs back above 50 (reversion
 * complete), after 10 days, or on a 2x ATR hard stop.
 * When it does NOT work: In a real crash RSI(2) stays pinned below 5 and the stop
 * fires — this is a knife-catcher, so it loses badly in bear markets. No trend = no
 * trades.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const pos = ctx.position;
  const prevClose = ctx.closes.at(-2);
  const rsi1 = ctx.rsi(2, 1);
  const ema200_1 = ctx.ema(200, 1);
  const atr = ctx.atr(14);
  if (prevClose == null || rsi1 == null || ema200_1 == null || atr == null) return null;

  if (pos === 0) {
    ctx.watch([{ side:'buy', price: prevClose, trigger:'below', note:'RSI2 panic', conds:[
      { label:'RSI(2) close', now: rsi1, op:'<', ref: 5, closed:true },
      { label:'price > EMA200', ok: prevClose > ema200_1 }
    ]}]);
    if (rsi1 < 5 && prevClose > ema200_1) {
      entryBar = ctx.i;
      return { side:'buy', qty: ctx.cash / price * 0.99 };
    }
    return null;
  }

  const stopPx = ctx.entryPx - 2 * atr;
  const held = ctx.i - (entryBar == null ? ctx.i : entryBar);
  const rsiNow = ctx.rsi(2);
  ctx.watch([
    { side:'sell', price: stopPx, trigger:'below', note:'hard stop' },
    { side:'sell', at: (ctx.candle?.t||0) + (10 - held) * 86400, note:'time stop' }
  ]);
  if (price <= stopPx) return { side:'sell', qty: pos };
  if (rsiNow != null && rsiNow > 50) return { side:'sell', qty: pos };
  if (held >= 10) return { side:'sell', qty: pos };
  return null;
}
let entryBar = null;
