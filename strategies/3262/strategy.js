/*
 * @soritrading-strategy v1
 * name: ETH Volatility Squeeze Breakout
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: A quiet market (low Bollinger width) is often followed by a strong directional move — we bet that breaking out of a squeeze starts a trend.
 * When it buys and sells: Buy when price breaks above the 20-day high AND the Bollinger band width is in its quietest 10% of the last 100 days. Sell when price falls 3×ATR below the highest point since entry (trailing stop).
 * When it does NOT work: In choppy, range-bound markets the breakout is fake and price snaps back — frequent whipsaws. Also loses in prolonged downtrends where the stop trails too far.
 */

function onUpdate(ctx) {
  // --- Squeeze detection on the last closed bar ---
  const bb = ctx.bb(20, 2, 1);
  if (bb == null) return null;
  const widthNow = (bb.upper - bb.lower) / bb.mid;

  // Percentile of current width among the last 100 closed bars
  let count = 0, below = 0;
  for (let i = 1; i <= 100; i++) {
    const b = ctx.bb(20, 2, i);
    if (b == null) continue;
    const w = (b.upper - b.lower) / b.mid;
    count++;
    if (w <= widthNow) below++;
  }
  if (count < 80) return null; // need a real sample before judging
  const pct = below / count;

  const high20 = ctx.high(20, 1); // 20-day high of the closed bar
  if (high20 == null) return null;

  // --- Exit: chandelier trailing stop while in a position ---
  if (ctx.position > 0) {
    const atr = ctx.atr(14, 1);
    if (atr == null) return null;
    let hh = ctx.entryPx;
    for (let i = 1; i <= ctx.i; i++) {
      const h = ctx.high(1, i);
      if (h == null) break;
      if (h > hh) hh = h;
    }
    const stop = hh - 3 * atr; // 3×ATR is the standard chandelier multiplier
    ctx.watch([{ side: 'sell', price: stop, trigger: 'below', note: 'chandelier stop' }]);
    if (ctx.price <= stop) return { side: 'sell', qty: ctx.position };
    return null;
  }

  // --- Entry: squeeze (quietest 10%) + 20-day-high breakout ---
  if (pct <= 0.10 && ctx.price > high20) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
