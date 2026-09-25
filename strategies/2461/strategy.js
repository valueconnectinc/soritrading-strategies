/*
 * @coinsori-strategy v1
 * name: BTC 4H Vol-Surge + ATR Trail + FearGreed Gate
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The champion (vol-surge breakout + 3x ATR trail) is solid
 *   but buys every breakout including ones right at market tops, where extreme
 *   greed marks exhaustion. The Crypto Fear & Greed index is a sentiment gauge
 *   that tends to peak near local tops. This gates the entry: skip a breakout
 *   when sentiment is at extreme greed, aiming to cut drawdown on the tops.
 * When it buys and sells: Buy 20-bar-high breaks on above-average volume ONLY
 *   when Fear & Greed is below 75 (not in extreme-greed territory). Exit on the
 *   3x ATR trailing stop below the highest close since entry.
 * When it does NOT work: In a strong melt-up, extreme greed can persist for
 *   weeks while price keeps climbing — the gate can filter out the best trend
 *   continuations. Also depends on the Fear & Greed feed being available.
 */
function onUpdate(ctx) {
  let hh = -Infinity;
  for (let i = 1; i <= 20; i++) {
    const h = ctx.high(20, i);
    if (h == null) return null;
    if (h > hh) hh = h;
  }
  const price = ctx.price;
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(50);
  if (vol == null || avgVol == null) return null;

  const pos = ctx.position;
  if (pos > 0) {
    const atr = ctx.atr(14, 1);
    if (atr == null) return null;
    const s = ctx.state;
    if (s.highest == null || price > s.highest) s.highest = price;
    const stop = s.highest - 3 * atr;
    if (price < stop) return { side: 'sell', qty: pos };
    return null;
  }

  // Sentiment gate: only enter when not at extreme greed (F&G < 75).
  const fg = ctx.data('fear_greed');
  if (fg == null) return null; // no sentiment data -> stay out
  if (price > hh && vol > avgVol * 1.5 && fg < 75) {
    ctx.state.highest = price;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
