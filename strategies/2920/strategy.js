/*
 * @coinsori-strategy v1
 * name: ETH 4H Bollinger MR Trailing-Stop
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: ETH dips to the lower Bollinger band snap back, and the
 * snap-back often continues past the middle band. Holding until RSI>60 captures
 * the full recovery, but in a choppy bear a dip can recover partway then fall
 * again. An ATR trailing stop locks in gains as the position recovers, so profit
 * is banked before the dip reverses in choppy markets.
 * When it buys and sells: it buys when price closes below the 20-bar lower
 * Bollinger band with RSI below 35 and price above the 200-bar average. It sells
 * when RSI climbs above 60, or when price falls 2 ATR below the highest point
 * since entry (a trailing stop). Position size scales with how far price fell.
 * When it does NOT work: in a strong melt-up it sits in cash and lags buy-and-hold
 * (defensive by design). A trailing stop can exit early on a normal pullback right
 * before the recovery continues, giving up part of the snap-back.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const atr = ctx.atr(14, 1);
  const px = ctx.closes[ctx.closes.length - 2];
  if (bb == null || bb.lower == null || rsi == null || sma200 == null || atr == null || px == null) return null;

  if (ctx.position > 0) {
    // Trailing stop: exit if price falls 2 ATR below the highest close since entry.
    const entry = ctx.entryPx || 0;
    const hiSinceEntry = Math.max(entry, ctx.high(1) || entry);
    if (px < hiSinceEntry - 2 * atr) return { side: 'sell', qty: ctx.position };
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
