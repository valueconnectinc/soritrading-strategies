/*
 * @coinsori-strategy v1
 * name: LTC Band-Bounce Cooldown 10 1D
 * ex: binance
 * syms: LTCUSDT
 * interval: 1d
 * cash: 1000
 *
 * Why this strategy: the 5-bar cooldown champion is the best version of the
 * band-bounce mean reversion. The MDD (~30%) comes from consecutive losing
 * trades (each bleeds a little before the mid-band exit). This variant doubles
 * the cooldown to 10 bars to space out failed-knife buys further and cut the
 * compounding of consecutive losses. It changes ONLY the cooldown length — entry
 * selectivity and full position size are untouched (the edge).
 * When it buys and sells: buys at/below lower Bollinger band with RSI oversold and
 * 10+ bars since last exit; sells at mid-band or RSI overbought.
 * When it does NOT work: a longer cooldown may miss the sharpest V-bounces that
 * happen close together, reducing total return even if it lowers MDD.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2);
  if (bb == null) return null;

  const rsi = ctx.rsi(14);
  const rsi_1 = ctx.rsi(14, 1);
  if (rsi == null || rsi_1 == null) return null;

  const lower = bb.lower;
  const mid = bb.mid;

  const lastExit = ctx.state.lastExit || -9999;
  const barsSinceExit = ctx.i - lastExit;
  const cooldownOk = barsSinceExit >= 10; // 10-bar wait after each exit (was 5)

  const atLowerBand = ctx.price <= lower;
  const rsiOversold = rsi < 35;

  if (atLowerBand && rsiOversold && cooldownOk && ctx.position === 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  const atMidBand = ctx.price >= mid;
  const rsiOverbought = rsi > 65 && rsi_1 <= 65;

  if ((atMidBand || rsiOverbought) && ctx.position > 0) {
    ctx.state.lastExit = ctx.i; // record exit bar for the cooldown
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
