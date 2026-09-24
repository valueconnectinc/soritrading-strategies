/*
 * @coinsori-strategy v1
 * name: ETC Band-Bounce Mean Reversion Cooldown 1D
 * ex: binance
 * syms: ETCUSDT
 * interval: 1d
 * cash: 1000
 *
 * Why this strategy: the champion band-bounce mean reversion has a known MDD
 * weakness — in sustained downtrends it repeatedly buys the same falling knife
 * (buy at lower band, sell at mid band at a loss, then buy the new lower band
 * again). A trend filter was tried and REJECTED because it blocks the bear-market
 * bounces that are the edge. Instead this adds a re-entry COOLDOWN: after each
 * exit, wait 5 bars before buying again. This should cut the repeated knife-catches
 * without removing the core bear-bounce edge.
 * When it buys and sells: buys when price closes at/below the lower Bollinger band
 * with RSI oversold AND at least 5 bars since the last exit; sells when price returns
 * to the middle band or RSI turns overbought.
 * When it does NOT work: in a slow grind down where price stays near the lower band
 * for many bars, the cooldown may cause it to miss the eventual bounce; and if the
 * downtrend is fast, it may still catch knives on the first touch.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2);
  if (bb == null) return null;

  const rsi = ctx.rsi(14);
  const rsi_1 = ctx.rsi(14, 1);
  if (rsi == null || rsi_1 == null) return null;

  const lower = bb.lower;
  const mid = bb.mid;

  // cooldown state: bar index of the last exit (default far in the past)
  const lastExit = ctx.state.lastExit || -9999;
  const barsSinceExit = ctx.i - lastExit;
  const cooldownOk = barsSinceExit >= 5; // 5-bar wait after each exit

  // BUY: at/below lower band AND RSI oversold AND cooldown satisfied
  const atLowerBand = ctx.price <= lower;
  const rsiOversold = rsi < 35;

  if (atLowerBand && rsiOversold && cooldownOk && ctx.position === 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // SELL: price at/above middle band OR RSI turns overbought
  const atMidBand = ctx.price >= mid;
  const rsiOverbought = rsi > 65 && rsi_1 <= 65;

  if ((atMidBand || rsiOverbought) && ctx.position > 0) {
    ctx.state.lastExit = ctx.i; // record exit bar for the cooldown
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
