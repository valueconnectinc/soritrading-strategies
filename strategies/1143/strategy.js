/*
 * @coinsori-strategy v1
 * name: RSI Momentum + Fear & Greed Filter
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Buys when 4H RSI crosses above 50 AND Fear & Greed Index is above 55
 * (market not in fear — sentiment backdrop is favorable for longs).
 * Sells when RSI crosses below 50, or after 16 bars, or on 3x ATR stop.
 * Why: RSI crossing 50 catches rising momentum; the Fear & Greed filter
 * prevents buying during panic drops where momentum flips too fast.
 * When it buys and sells: Enter on dual confirmation (RSI + sentiment),
 * exit on momentum loss or time/ATR limit.
 * When it does NOT work: In slow grinding uptrends (RSI stays > 50
 * indefinitely), the 50-level exit leaves profit on the table.
 * In flash-crash events Fear & Greed may lag by a day.
 */

function onUpdate(ctx) {
  const rsi     = ctx.rsi(14);
  const prevRsi = ctx.rsi(14, 1);
  if (rsi == null || prevRsi == null) return null;

  const fg = ctx.data('fear_greed');  // 0–100, updated daily
  const price = ctx.price;
  const inPos  = ctx.position > 0;

  // ── ENTRY: RSI crosses above 50 AND Fear & Greed ≥ 55 ──
  if (!inPos && prevRsi <= 50 && rsi > 50 && fg != null && fg >= 55) {
    ctx.state.entryBar = ctx.i;
    ctx.state.entryPx  = price;
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }

  // ── EXIT: RSI crosses below 50 ──
  if (inPos && prevRsi >= 50 && rsi < 50) {
    ctx.state.entryBar = null;
    ctx.state.entryPx  = null;
    return { side: 'sell', qty: ctx.position };
  }

  // ── TIME EXIT: max 16 bars (~2.7 days) ──
  if (inPos) {
    if (ctx.state.entryBar == null) ctx.state.entryBar = ctx.i;
    if (ctx.i - ctx.state.entryBar >= 16) {
      ctx.state.entryBar = null;
      ctx.state.entryPx  = null;
      return { side: 'sell', qty: ctx.position };
    }
  }

  // ── ATR STOP LOSS: 3× ATR from entry ──
  if (inPos && ctx.state.entryPx) {
    const atr = ctx.atr(14);
    if (atr != null) {
      const stopPx = ctx.state.entryPx - atr * 3;
      if (price < stopPx) {
        ctx.state.entryBar = null;
        ctx.state.entryPx  = null;
        return { side: 'sell', qty: ctx.position };
      }
    }
  }

  return null;
}
