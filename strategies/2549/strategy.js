/*
 * @coinsori-strategy v1
 * name: Bollinger Squeeze Breakout BTC 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: When Bollinger bands squeeze to their narrowest in a while
 * (volatility contraction), a sharp directional move usually follows. This is a
 * volatility-expansion momentum play — the opposite of the fear-contrarian champion
 * which buys panic dips. It catches the acceleration leg after a quiet build-up.
 * When it buys and sells: buys when band width is in its lowest 20% of the last 100
 * bars (squeeze) AND price breaks above the upper band on above-average volume; sells
 * when price falls back to the middle band or breaks the 20-bar low. Position is
 * volatility-targeted so a 1-ATR adverse move costs ~1.5% of equity.
 * When it does NOT work: a squeeze can resolve DOWNWARD — this only buys the upward
 * break, so it misses down moves and can get caught buying a breakdown that reverses.
 * In a long low-volatility grind it never triggers. It also whipsaws if the squeeze
 * "breaks" then immediately re-squeezes.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const atr = ctx.atr(14, 1);
  const avgVol = ctx.avgVol(20);
  if (bb == null || bb.upper == null || bb.lower == null || bb.mid == null) return null;
  if (atr == null || avgVol == null) return null;
  const price = ctx.price;

  // band width now vs the last 100 bars — is this a squeeze (lowest 20%)?
  const widthNow = (bb.upper - bb.lower) / bb.mid;
  let widthBelow = 0;
  let counted = 0;
  for (let k = 1; k <= 100; k++) {
    const b = ctx.bb(20, 2, k);
    if (b == null || b.upper == null || b.lower == null || b.mid == null) continue;
    const w = (b.upper - b.lower) / b.mid;
    if (w < widthNow) widthBelow++;
    counted++;
  }
  if (counted < 40) return null; // need enough history
  const squeeze = widthBelow / counted <= 0.20;

  // lowest low of last 20 bars for the exit
  let lo = Infinity;
  for (let k = 1; k <= 20; k++) {
    const l = ctx.low(1, k);
    if (l == null) return null;
    if (l < lo) lo = l;
  }

  const pos = ctx.position;
  if (pos > 0) {
    if (price < lo) return { side: 'sell', qty: pos };
    if (price <= bb.mid) return { side: 'sell', qty: pos };
    return null;
  }

  if (!squeeze) return null;

  const vol = ctx.vol;
  if (vol == null) return null;
  const volSurge = vol > avgVol * 1.2;

  // Volatility-targeted sizing: 1-ATR adverse move costs ~1.5% of equity.
  const riskBudget = 0.015;
  const volFrac = riskBudget / (atr / price);
  const qty = (ctx.cash / price) * Math.min(volFrac, 0.99);

  if (volSurge && price > bb.upper) {
    return { side: 'buy', qty: qty };
  }
  return null;
}
