/*
 * @coinsori-strategy v1
 * name: LTC Band-Bounce Mean Reversion Cooldown 1D
 * ex: binance
 * syms: LTCUSDT
 * interval: 1d
 * cash: 1000
 *
 * Why this strategy: the cooldown version of the band-bounce mean reversion beat
 * buy-and-hold on all 4 disjoint ETC 1D windows (+71/+642/+240/+669%) with
 * controlled MDD by stopping repeated falling-knife buys. This is the LTC 1D
 * version (the other 1D-validated asset) as an out-of-sample confirmation. ATR
 * position sizing and a fear/greed confirmation were tried and REJECTED because
 * they cap/remove the bear-market bounces that are the edge.
 * When it buys and sells: buys when price closes at/below the lower Bollinger band
 * with RSI oversold AND at least 5 bars since the last exit; sells when price returns
 * to the middle band or RSI turns overbought.
 * When it does NOT work: in a slow grind down where price stays near the lower band
 * for many bars, the cooldown may cause it to miss the eventual bounce; and in fast
 * crashes it may still catch a knife on the first touch.
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
