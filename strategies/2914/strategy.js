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
 * (low RSI), and only while price is above its 200-bar average (so it does not
 * catch a falling knife in a real crash), then selling the bounce back to the
 * middle band harvests that snap-back. This is the defensive mean-reversion
 * recipe that validated positively on ETH and BTC.
 * When it buys and sells: it buys when price closes below the 20-bar lower
 * Bollinger band with RSI below 35 and price above the 200-bar average. It sells
 * when price returns to the middle band (20-bar average), RSI climbs above 60,
 * or price falls 3 ATR below the entry (a volatility stop that cuts losers).
 * Position size scales with how far price has fallen below the band.
 * When it does NOT work: in a strong melt-up it sits in cash and badly lags
 * buy-and-hold (defensive by design). In a sustained bear it rarely buys because
 * price stays below the 200-bar average. In very tight chop the band touch
 * happens rarely, so returns are small.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const atr = ctx.atr(14, 1);
  const px = ctx.closes[ctx.closes.length - 2];
  if (bb == null || bb.lower == null || rsi == null || sma200 == null || atr == null || px == null) return null;

  // Exit: bounce back to the middle band, RSI no longer oversold, or hard stop.
  if (ctx.position > 0) {
    const stop = (ctx.entryPx || 0) - 3 * atr; // volatility stop cuts losers
    if (px >= bb.mid || rsi > 60 || px < stop) return { side: 'sell', qty: ctx.position };
    return null;
  }

  // Entry: deep dip to lower band + oversold, only above the 200-bar trend line.
  if (px <= bb.lower && rsi < 35 && px > sma200) {
    // Size by band depth: risk 4% of equity on the band-to-mid distance.
    const equity = ctx.cash + ctx.position * ctx.price;
    const bandDist = Math.max(bb.mid - bb.lower, atr);
    const qty = Math.max(0, Math.min((equity * 0.04) / bandDist, (ctx.cash / ctx.price) * 0.95));
    if (qty > 0) return { side: 'buy', qty: qty };
  }
  return null;
}
