/*
 * @coinsori-strategy v1
 * name: Vol-Targeted Momentum BTC 1D
 * ex: binance
 * syms: BTC
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The edge is risk control, not timing. In calm markets we hold a
 * large position, in turbulent markets a small one — so a crash hits a shrunken book.
 * We only ride BTC while its 100-day trend is up.
 * When it buys and sells: Buys when BTC closes above its 100-day average while sizing
 * the position so expected daily volatility stays ~2% (inverse-ATR sizing). Sells when
 * the trend breaks, price falls 3x ATR below entry, or sizing shifts by >30%.
 * When it does NOT work: In a long bear market it keeps re-entering on bounces and
 * bleeding. A sudden crash can still hit before the ATR has time to shrink the book.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const ema100 = ctx.ema(100, 1);        // closed-bar trend filter
  const atr = ctx.atr(14, 1);            // closed-bar volatility
  if (ema100 == null || atr == null) return null;

  const atrPct = atr / price;
  const targetVol = 0.02;                // 2% daily vol target — constant risk across regimes
  let sizeFrac = targetVol / atrPct;     // inverse-vol sizing: big position in calm, small in storm
  if (sizeFrac > 1) sizeFrac = 1;        // cap at 100% — never leverage on spot
  if (sizeFrac < 0.03) sizeFrac = 0.03;  // floor so we never fully vanish — tiny residual risk

  const pos = ctx.position;
  if (pos === 0) {
    ctx.watch([{ side: 'buy', price: ema100, trigger: 'above', note: '100d trend up' }]);
    if (price > ema100) {
      return { side: 'buy', qty: ctx.cash / price * sizeFrac };
    }
    return null;
  }

  const stopPx = ctx.entryPx - 3 * atr;  // hard stop — 3x ATR below entry, scaled with vol
  const equity = ctx.cash + pos * price;
  const wantQty = equity / price * sizeFrac;
  ctx.watch([
    { side: 'sell', price: stopPx, trigger: 'below', note: 'hard stop' },
    { side: 'sell', price: ema100, trigger: 'below', note: 'trend fail' }
  ]);
  if (price < stopPx) return { side: 'sell', qty: pos };
  if (price < ema100) return { side: 'sell', qty: pos };

  // rebalance only when target size moved >30% (avoid fee bleed from tiny changes)
  if (Math.abs(wantQty - pos) / pos > 0.3) {
    if (wantQty > pos) return { side: 'buy', qty: wantQty - pos };
    return { side: 'sell', qty: pos - wantQty };
  }
  return null;
}
