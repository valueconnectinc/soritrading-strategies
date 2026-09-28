/*
 * @coinsori-strategy v1
 * name: ETH 4H Bollinger MR RSI-Exit
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: ETH dips to the lower Bollinger band snap back, but the
 * snap-back often continues well past the middle band. Selling at the middle band
 * caps the profit and leaves money on the table. Holding until RSI climbs back
 * above 60 (no longer oversold) lets the recovery run further and captures the
 * bigger bounces that the mid-band exit misses.
 * When it buys and sells: it buys when price closes below the 20-bar lower
 * Bollinger band with RSI below 35 and price above the 200-bar average. It sells
 * when RSI climbs above 60 (the oversold condition fully resolves). Position size
 * scales with how far price fell below the band.
 * When it does NOT work: in a strong melt-up it sits in cash and lags buy-and-hold
 * (defensive by design). If a dip keeps falling (no snap-back), holding until RSI
 * recovers means riding the whole decline instead of cutting at the mid-band. In a
 * sustained bear below the 200-bar average it stays out entirely.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const atr = ctx.atr(14, 1);
  const px = ctx.closes[ctx.closes.length - 2];
  if (bb == null || bb.lower == null || rsi == null || sma200 == null || atr == null || px == null) return null;

  // Wider exit: hold until RSI fully recovers above 60, letting the snap-back run
  // past the mid-band to capture bigger recoveries.
  if (ctx.position > 0) {
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
