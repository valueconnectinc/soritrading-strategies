/*
 * @coinsori-strategy v1
 * name: BTCUSDT 4H Trend-Filtered Breakout
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Buy when BTC 4H price breaks above the highest high of the last 20 bars
 * with 2x average volume — AND the 20 EMA is rising (bullish alignment).
 * Hold 8 bars (~1.3 days) or until ATR-based stop.
 * Why: Volume surge + range expansion catches institutional moves.
 * The EMA20 rising filter avoids chasing breakouts in downtrends.
 * When it buys and sells: Enter on 4H close above 20-bar high + volume 2x avg.
 * Exit after 8 bars OR if price drops 2.5x ATR from entry.
 * When it does NOT work: In slow grinding markets with no clear range
 * expansion, the stop gets hit repeatedly. Works best after consolidation.
 */

function onUpdate(ctx) {
  const atr = ctx.atr(14);
  const vol20 = ctx.avgVol(20);
  const ema20 = ctx.ema(20);
  if (atr == null || vol20 == null || ema20 == null) return null;

  // 20-bar highest high (ago=1 = closed bar, not current forming bar)
  const hh20 = ctx.high(20, 1);
  if (hh20 == null) return null;

  // EMA rising: current EMA > EMA 1 bar ago
  const ema20Prev = ctx.ema(20, 1);
  if (ema20Prev == null) return null;
  const emaRising = ema20 > ema20Prev;

  const price = ctx.price;
  const vol = ctx.vol;
  if (vol == null) return null;

  const inPos = ctx.position > 0;

  // === ENTRY: price above 20-bar high + volume 2x avg + EMA rising ===
  if (!inPos && price > hh20 && vol > vol20 * 2.0 && emaRising) {
    ctx.state.entryBar = ctx.i;
    ctx.state.entryPx = price;
    const stopPx = price - atr * 2.5;
    return {
      side: 'buy',
      qty: ctx.cash / price * 0.99,
      type: 'limit',
      price: price,
      trigger: { side: 'sell', qty: ctx.cash / price * 0.99, type: 'stop', price: stopPx }
    };
  }

  // === TIME EXIT: close after 8 bars ===
  if (inPos) {
    if (ctx.state.entryBar == null) ctx.state.entryBar = ctx.i;
    const barsHeld = ctx.i - ctx.state.entryBar;
    if (barsHeld >= 8) {
      ctx.state.entryBar = null;
      ctx.state.entryPx = null;
      return { side: 'sell', qty: ctx.position };
    }
  }

  // === STOP EXIT: 2.5x ATR from entry ===
  if (inPos && ctx.state.entryPx) {
    const stopPx = ctx.state.entryPx - atr * 2.5;
    if (price < stopPx) {
      ctx.state.entryBar = null;
      ctx.state.entryPx = null;
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
