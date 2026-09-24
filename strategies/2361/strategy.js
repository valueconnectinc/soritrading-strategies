/*
 * @coinsori-strategy v1
 * name: LTC Band-Bounce Bounce-Confirm Cooldown 1D
 * ex: binance
 * syms: LTCUSDT
 * interval: 1d
 * cash: 1000
 *
 * Why this strategy: the champion band-bounce buys right at the lower-band touch,
 * which catches falling knives that cause ~30% MDD. This variant does NOT buy the
 * first touch — it waits for the NEXT bar to close back above the lower band (a
 * bounce confirmation) before entering, so it buys the start of the recovery
 * instead of the capitulation. Position size stays FULL (unlike rejected ATR sizing).
 * When it buys and sells: buys when the previous bar closed at/below the lower
 * Bollinger band AND the current bar closes back above it, with RSI turning up from
 * oversold and 5+ bars since last exit; sells at mid-band or RSI overbought.
 * When it does NOT work: if the bounce is weak and price only briefly pokes back
 * above the band before falling again, the confirmation may still enter too early,
 * or it may miss the sharpest V-bounces that never pull back above the band.
 */
function onUpdate(ctx) {
  const bbNow = ctx.bb(20, 2);
  const bbPrev = ctx.bb(20, 2, 1);
  if (bbNow == null || bbPrev == null) return null;

  const rsi = ctx.rsi(14);
  const rsi_1 = ctx.rsi(14, 1);
  if (rsi == null || rsi_1 == null) return null;

  const closeNow = ctx.closes[0];
  const closePrev = ctx.closes[1];
  if (closeNow == null || closePrev == null) return null;

  const lastExit = ctx.state.lastExit || -9999;
  const barsSinceExit = ctx.i - lastExit;
  const cooldownOk = barsSinceExit >= 5; // 5-bar wait after each exit

  // BOUNCE CONFIRMATION: previous bar closed at/below lower band (capitulation),
  // current bar closes back above it (recovery starting)
  const prevCapitulated = closePrev <= bbPrev.lower;
  const nowBounced = closeNow > bbNow.lower;
  const rsiTurningUp = rsi > rsi_1 && rsi < 60; // recovering from oversold, not yet hot

  if (prevCapitulated && nowBounced && rsiTurningUp && cooldownOk && ctx.position === 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // SELL: price at/above middle band OR RSI turns overbought
  const atMidBand = ctx.price >= bbNow.mid;
  const rsiOverbought = rsi > 65 && rsi_1 <= 65;

  if ((atMidBand || rsiOverbought) && ctx.position > 0) {
    ctx.state.lastExit = ctx.i; // record exit bar for the cooldown
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
