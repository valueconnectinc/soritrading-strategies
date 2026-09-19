/*
 * @coinsori-strategy v1
 * name: Bollinger Band + RSI Mean Reversion
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Mean reversion on SOL catches sharp pullbacks to fair value
 * before the next leg up — the opposite of momentum. SOL's high-beta nature means
 * oversold bounces are sharp and profitable when caught early.
 * When it buys and sells: Buy when price pierces the lower Bollinger Band (2σ)
 * AND RSI is oversold (<40). Sell when price reaches the middle BB (20 SMA) or
 * RSI hits 55 (moderate overbought — take profit sooner). Stop at 1.5× ATR below entry.
 * When it does NOT work: In sustained one-directional moves where price hugs the
 * lower band for days — the strategy keeps buying into a falling knife with no bounce.
 * Also fails in low-volatility regimes where BB bands are tight and signals are noisy.
 */

function onUpdate(ctx) {
  // Indicators
  const bb  = ctx.bb(20, 2);
  const rsi = ctx.rsi(14);
  const atr = ctx.atr(14);

  if (bb == null || rsi == null || atr == null) return null;

  const price = ctx.price;
  const inPos = ctx.position > 0;
  const flat  = ctx.position === 0;

  const [lower, mid] = [bb.lower, bb.middle];

  // ── Entry: price below lower BB + RSI oversold (<40, relaxed from 35) ─
  // This fires more often, catching more pullback bounces
  const entrySignal = flat && price < lower && rsi < 40;

  if (entrySignal) {
    const sl = price - 1.5 * atr;
    return {
      side: 'buy',
      qty: ctx.cash / price * 0.98,
      type: 'limit',
      price: price,
      postOnly: true,
      trigger: { side: 'sell', type: 'stop', price: sl }
    };
  }

  // ── Exit: price at middle BB OR RSI hits 55 (softer exit, take profit earlier) ─
  const exitSignal = inPos && (price >= mid || rsi > 55);

  if (exitSignal) {
    return { side: 'sell', qty: ctx.position, type: 'market' };
  }

  return null;
}
