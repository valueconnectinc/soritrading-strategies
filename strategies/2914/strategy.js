/*
 * @coinsori-strategy v1
 * name: ETH 4H Bollinger Mean-Reversion
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: ETH overshoots to the downside on fear and snaps back.
 * Buying a deep dip to the lower Bollinger band when the market is oversold
 * (low RSI), then selling the bounce back to the middle band harvests that
 * snap-back. This is the defensive mean-reversion recipe that validated
 * positively on ETH and BTC in the experiment ledger.
 * When it buys and sells: it buys when price closes below the 20-bar lower
 * Bollinger band with RSI below 35, and sells when price returns to the middle
 * band (20-bar average) or RSI climbs above 60. Position size scales with how
 * far price has fallen below the band, so deeper dips get larger positions.
 * When it does NOT work: in a strong melt-up it sits in cash and badly lags
 * buy-and-hold (defensive by design). In a sustained bear it keeps buying dips
 * that keep going down, so it can lose money while a pure cash position would
 * have done better.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const atr = ctx.atr(14, 1);
  const px = ctx.closes[ctx.closes.length - 2];
  if (bb == null || bb.lower == null || rsi == null || atr == null || px == null) return null;

  // Exit: bounce back to the middle band, or RSI no longer oversold.
  if (ctx.position > 0) {
    if (px >= bb.mid || rsi > 60) return { side: 'sell', qty: ctx.position };
    return null;
  }

  // Entry: deep dip to lower band + oversold.
  if (px <= bb.lower && rsi < 35) {
    // Size by band depth: risk 4% of equity on the band-to-mid distance.
    const equity = ctx.cash + ctx.position * ctx.price;
    const bandDist = Math.max(bb.mid - bb.lower, atr);
    const qty = Math.max(0, Math.min((equity * 0.04) / bandDist, (ctx.cash / ctx.price) * 0.95));
    if (qty > 0) return { side: 'buy', qty: qty };
  }
  return null;
}
