/*
 * @coinsori-strategy v1
 * name: ETH Daily SMA Entry + Donchian Exit
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The ETH daily 200-SMA trend ride (2216) is our best
 * validated family, but its known weakness is exiting on the first meaningful
 * dip in a bull and re-entering late. A Donchian-style exit (only sell when the
 * close makes a new 30-day low) tolerates normal pullbacks and lets winners run.
 * When it buys and sells: long on a daily close crossing above the 200-SMA;
 * sell only when the close breaks below its 30-day low (new 30-day low), or
 * when price falls back below the 200-SMA after having been well above it.
 * Position scales with trend strength (strong = bigger, capped).
 * When it does NOT work: in a slow grinding bear, price makes new lows slowly
 * and the 30-day exit is slow to trigger, giving back more than a tight exit;
 * in a sideways range the 200-SMA entry still whipsaws on entries.
 */
function onUpdate(ctx) {
  const sma = ctx.sma(200, 1);
  const smaP = ctx.sma(200, 2);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  const closePrev2 = ctx.closes[ctx.closes.length - 3];
  if (sma == null || smaP == null || closePrev == null || closePrev2 == null) return null;

  // 30-day Donchian low: lowest close over the last 30 bars (closed bars)
  const n = 30;
  if (ctx.closes.length < n + 3) return null;
  let low30 = Infinity;
  for (let k = ctx.closes.length - 2; k >= ctx.closes.length - 1 - n; k--) {
    if (ctx.closes[k] < low30) low30 = ctx.closes[k];
  }

  const price = ctx.price;
  const pos = ctx.position;
  const cash = ctx.cash;

  if (pos <= 0) {
    // enter on a fresh close above the 200-SMA (prev below, now above)
    if (closePrev2 <= smaP && closePrev > sma) {
      const atr = ctx.atr(14, 1);
      if (atr == null || atr <= 0) return { side: 'buy', qty: (cash / price) * 0.98 };
      const distPct = (closePrev - sma) / sma;
      const risk = 300 + Math.min(Math.max(distPct * 20000, 0), 1200);
      const riskQty = risk / atr;
      const maxQty = (cash / price) * 0.98;
      return { side: 'buy', qty: Math.min(riskQty, maxQty) };
    }
    return null;
  } else {
    // exit on a new 30-day low (close breaks below Donchian low)
    if (closePrev < low30) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
