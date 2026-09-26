/*
 * @coinsori-strategy v1
 * name: FearGreed Panic Mean-Reversion BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Sentiment extremes on the crypto fear-greed index mark
 * panic bottoms and euphoria tops. The validated champion uses fear-greed only
 * as a position-sizing filter on a price signal; here we make sentiment the
 * PRIMARY timing signal on a daily timeframe — buy when the crowd is in extreme
 * fear and price has already pulled back, exit when sentiment recovers. This is
 * a genuinely different family (sentiment-driven mean reversion) from the
 * price-based band-bounce and squeeze-breakout champions.
 * When it buys and sells: buys when the fear-greed index is at extreme fear
 * (<20) AND price is below its 50-day average (already sold off), so we are not
 * catching a falling knife in a melt-up. Sells when sentiment recovers to
 * neutral (>50) or after 40 trading days, or a 4-ATR stop to cap a panic that
 * keeps falling.
 * When it does NOT work: extreme fear can persist for months in a real bear
 * market — buying early into a sustained downtrend loses even though sentiment
 * is "extreme fear". It also never buys during melt-ups (no fear), so it misses
 * most of a bull run. A panic that keeps falling still loses despite the
 * sentiment signal.
 */
function onUpdate(ctx) {
  const fg = ctx.data('fear_greed');
  const sma50 = ctx.sma(50, 1);
  if (fg == null || sma50 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    // Exit on sentiment recovery to neutral, or after 40 days, or a hard stop.
    if (fg > 50) {
      return { side: 'sell', qty: pos };
    }
    const atr = ctx.atr(14, 1);
    if (atr != null && price <= ctx.entryPx - atr * 4) {
      return { side: 'sell', qty: pos };
    }
    if (ctx.state.entryBar != null && ctx.i - ctx.state.entryBar >= 40) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Buy only at extreme fear (<20) with price below its 50-day average.
  if (!(fg < 20 && price < sma50)) return null;

  ctx.state.entryBar = ctx.i;
  return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
}
