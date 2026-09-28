/*
 * @coinsori-strategy v1
 * name: ETH 4H Bollinger MR RSI-Exit + Stop
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: ETH dips to the lower Bollinger band snap back, and the
 * snap-back often continues well past the middle band. Holding until RSI climbs
 * back above 60 captures the full recovery. But holding longer also means riding
 * a dip that keeps falling, so a 3-ATR hard stop caps the damage on the rare
 * trades that go wrong (the choppy 2022-24 regime).
 * When it buys and sells: it buys when price closes below the 20-bar lower
 * Bollinger band with RSI below 35 and price above the 200-bar average. It sells
 * when RSI climbs above 60, or cuts the position if price falls 3 ATR below entry.
 * Position size scales with how far price fell below the band.
 * When it does NOT work: in a strong melt-up it sits in cash and lags buy-and-hold
 * (defensive by design). In a sustained bear below the 200-bar average it stays out
 * entirely. A hard stop turns a temporary dip into a realized loss right before a
 * rebound, so it can hurt in fast V-shaped recoveries.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const atr = ctx.atr(14, 1);
  const px = ctx.closes[ctx.closes.length - 2];
  if (bb == null || bb.lower == null || rsi == null || sma200 == null || atr == null || px == null) return null;

  if (ctx.position > 0) {
    // Hard stop: exit if price falls 3 ATR below entry (caps the choppy-bear loss).
    const entry = ctx.entryPx || 0;
    if (entry > 0 && px < entry - 3 * atr) return { side: 'sell', qty: ctx.position };
    if (rsi > 60) return { side: 'sell', qty: ctx.position };
    return null;
  }

  if (px <= bb.lower && rsi < 35 && px > sma200) {
    const equity = ctx.cash + ctx.position * ctx.price;
    const bandDist = Math.max(bb.mid - bb.lower, atr);
    const qty = Math.max(0, Math.min((equity * 0.04) / bandDist, (ctx.cash / ctx.price) * 0.95));
    if (qty > 0) return { side: 'buy', qty: qty };
  }
  return null;
}
