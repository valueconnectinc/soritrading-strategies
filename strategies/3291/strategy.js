/*
 * @coinsori-strategy v1
 * name: ADA Donchian 55/30 Breakout 1D
 * ex: binance
 * syms: ADAUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Donchian channel breakout on ADA 1d was the one trend-following
 * setup the experiment ledger marked promising (all other trend attempts failed).
 * It rides sustained up-moves and cuts losses when the 30-day low breaks.
 * When it buys and sells: Buys when price closes above the highest high of the last
 * 55 bars. Sells when price closes below the lowest low of the last 30 bars, or on a
 * hard 2.5x ATR stop. Each position sized so a 2.5x ATR adverse move costs ~4% of equity.
 * When it does NOT work: In long sideways chop the 55-bar breakout whipsaws and the
 * 30-bar exit gives back most gains. In a slow grind-down the 55-bar high is never
 * reached, so it stays flat and misses nothing (but also earns nothing).
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) { ctx.watch([]); return null; }

  // Closed-bar Donchian levels: highest high of last 55 bars, lowest low of last 30 bars.
  const hi55 = ctx.high(55, 1);
  const lo30 = ctx.low(30, 1);
  const atr = ctx.atr(14, 1);
  if (hi55 == null || lo30 == null || atr == null || atr <= 0) { ctx.watch([]); return null; }

  const pos = ctx.position;
  if (pos > 0) {
    const stopPx = ctx.entryPx - 2.5 * atr;
    ctx.watch([
      { side: 'sell', price: lo30, trigger: 'below', qty: pos, note: '30d Donchian exit' },
      { side: 'sell', price: stopPx, trigger: 'below', qty: pos, note: '2.5x ATR hard stop' }
    ]);
    if (price < lo30 || price <= stopPx) return { side: 'sell', qty: pos };
    return null;
  }

  // Entry on a 55-bar high breakout (closed bar), risk 4% of equity on a 2.5x ATR stop.
  if (price > hi55) {
    const riskPerCoin = 2.5 * atr;
    let qty = (ctx.cash * 0.04) / riskPerCoin;
    const maxQty = (ctx.cash / price) * 0.99;
    qty = Math.min(qty, maxQty);
    if (qty <= 0) { ctx.watch([]); return null; }
    ctx.watch([{ side: 'buy', price: hi55, trigger: 'above', note: '55d Donchian breakout' }]);
    return { side: 'buy', qty: qty };
  }

  ctx.watch([{ side: 'buy', price: hi55, trigger: 'above', note: '55d Donchian breakout' }]);
  return null;
}
