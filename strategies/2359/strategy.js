/*
 * @coinsori-strategy v1
 * name: LTC Band-Bounce Cooldown + StopLoss 1D
 * ex: binance
 * syms: LTCUSDT
 * interval: 1d
 * cash: 1000
 *
 * Why this strategy: the champion band-bounce mean reversion (cooldown) beats
 * buy-and-hold on all windows but carries 39-59% MDD on 1D because it holds
 * every position until mid-band, including failed bounces that keep falling.
 * This variant adds a hard stop-loss below entry to cut those worst knife
 * trades while keeping FULL position size (so it does NOT cap the bear-market
 * bounces that are the edge — unlike the rejected ATR sizing).
 * When it buys and sells: buys at/below lower Bollinger band with RSI oversold
 * and 5+ bars since last exit; sells at mid-band, RSI overbought, OR a hard stop
 * stopPct below entry.
 * When it does NOT work: a stop that is too tight cuts valid bounces before they
 * recover to mid-band; in a slow grind the cooldown may miss the eventual bounce.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2);
  if (bb == null) return null;

  const rsi = ctx.rsi(14);
  const rsi_1 = ctx.rsi(14, 1);
  if (rsi == null || rsi_1 == null) return null;

  const lower = bb.lower;
  const mid = bb.mid;
  const stopPct = 0.20; // hard stop 20% below entry: cuts the deepest failed knives

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

  // SELL: price at/above middle band OR RSI turns overbought OR hard stop hit
  const atMidBand = ctx.price >= mid;
  const rsiOverbought = rsi > 65 && rsi_1 <= 65;
  const stopHit = ctx.position > 0 && ctx.price <= ctx.entryPx * (1 - stopPct);

  if ((atMidBand || rsiOverbought || stopHit) && ctx.position > 0) {
    ctx.state.lastExit = ctx.i; // record exit bar for the cooldown
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
