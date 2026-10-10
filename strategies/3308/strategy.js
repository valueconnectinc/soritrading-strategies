/*
 * @coinsori-strategy v1
 * name: ETH RSI2 Uptrend Dip-Buy 1D
 * ex: binance
 * syms: ETH
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: In a long-term uptrend, sharp short panic dips (RSI(2) below 5) tend to snap
 * back because buyers step in at support. We bet on that snap-back, but ONLY while the 200-day
 * average is rising, so we never catch a falling knife in a bear market.
 * When it buys and sells: Buys when the last closed price is above the 200-day average AND RSI(2)
 * is extremely oversold (< 5). Sells when RSI(2) recovers above 50, or earlier if price falls
 * 2.5 ATR below entry (hard stop). Position sized so a stop costs ~2% of cash.
 * When it does NOT work: In a choppy flat market price sits near the 200-day average and the
 * strategy can stop out repeatedly and bleed fees. It also misses strong rallies entirely
 * because it waits for a dip that never comes.
 */
function onUpdate(ctx) {
  const ema200 = ctx.ema(200, 1);
  const rsi = ctx.rsi(2, 1);
  const atr = ctx.atr(14, 1);
  if (ema200 == null || rsi == null || atr == null) return null;

  const price = ctx.price;
  const prevClose = ctx.closes.at(-2);
  if (prevClose == null) return null;

  const watch = [];
  if (ctx.position > 0 && ctx.entryPx != null) {
    watch.push({ side: 'sell', price: ctx.entryPx - 2.5 * atr, trigger: 'below', note: 'hard stop 2.5ATR' });
  }
  watch.push({ side: 'buy', price: prevClose, trigger: 'below', note: 'RSI(2) oversold dip',
    conds: [{ label: 'RSI(2) close', now: rsi, op: '<', ref: 5, closed: true },
            { label: 'close>EMA200', ok: prevClose > ema200 }] });
  ctx.watch(watch);

  if (ctx.position > 0) {
    const entry = ctx.entryPx;
    if (entry == null) return null;
    // hard stop: 2.5x ATR below entry caps the loss on a single trade
    if (price <= entry - 2.5 * atr) return { side: 'sell', qty: ctx.position };
    // reversion target: RSI(2) back above 50 on a closed bar = dip fully recovered
    if (rsi > 50) return { side: 'sell', qty: ctx.position };
    return null;
  }

  // uptrend gate: last closed bar must be above the 200-day average
  if (prevClose <= ema200) return null;
  // entry: extreme oversold on a closed bar (no repaint in live)
  if (rsi < 5) {
    const stopDist = 2.5 * atr;
    const riskCash = ctx.cash * 0.02; // risk 2% of cash per trade so a stop costs ~2%, not the account
    const qty = Math.min(riskCash / stopDist, (ctx.cash / price) * 0.99);
    if (qty <= 0) return null;
    return { side: 'buy', qty };
  }
  return null;
}
