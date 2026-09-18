/*
 * @coinsori-strategy v1
 * name: BTCUSDT 4H Volatility Breakout
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Buy when BTC breaks above the highest high of the last 20 bars (2 days)
 * with above-average volume. Hold ~6 bars (1 day) or until ATR-based stop.
 * Why: BTC makes explosive range-expansion moves; fade the breakout
 * rather than chase it. Volume confirms the move is real.
 * When it buys and sells: Enter on 4H close above 20-bar high + volume surge.
 * Exit after 6 bars OR if price falls back below ATR-based stop.
 * When it does NOT work: In slow grinding markets with no range expansion,
 * the tight stop gets hit repeatedly by noise. Works best in trending/volatile BTC.
 */

function onUpdate(ctx) {
  // Need 20 bars for the range, 14 for ATR, 20 for volume SMA
  const atr = ctx.atr(14);
  const vol20 = ctx.avgVol(20);
  if (atr == null || vol20 == null) return null;

  // 20-bar highest high (ago=1 so it's a closed bar, not current forming bar)
  const hh20 = ctx.high(20, 1);
  if (hh20 == null) return null;

  // Current bar volume
  const vol = ctx.vol;
  if (vol == null) return null;

  const price = ctx.price;

  // === ENTRY: price closes above 20-bar high with volume surge ===
  // Volume must be 1.5x the 20-bar average — confirms institutional move
  if (price > hh20 && vol > vol20 * 1.5) {
    // ATR-based stop: 2x ATR below entry — gives room, not too tight
    const stopPx = price - atr * 2;
    return {
      side: 'buy',
      qty: ctx.cash / price * 0.99,
      type: 'limit',
      price: price,
      // smart order: chase if not filled, exit on stop
      trigger: { side: 'sell', qty: ctx.cash / price * 0.99, type: 'stop', price: stopPx }
    };
  }

  // === TIME EXIT: close after 6 bars if in position ===
  // ctx.i is the current bar index; we track entry bar via position state
  // Use ctx.state to persist entry bar (ctx.state is a simple object store)
  if (ctx.position > 0) {
    if (!ctx.state.entryBar) ctx.state.entryBar = ctx.i;
    const barsHeld = ctx.i - ctx.state.entryBar;
    if (barsHeld >= 6) {
      ctx.state.entryBar = null;
      return { side: 'sell', qty: ctx.position };
    }
  }

  // === STOP EXIT: if price falls 2x ATR from entry ===
  if (ctx.position > 0 && ctx.entryPx) {
    const stopPx = ctx.entryPx - atr * 2;
    if (price < stopPx) {
      ctx.state.entryBar = null;
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
