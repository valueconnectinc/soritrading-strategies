/*
 * @coinsori-strategy v1
 * name: Donchian Channel Breakout
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Donchian channels capture the most basic market truth — when
 * price breaks above the highest high of the last N bars, the market is entering a
 * new phase of strength. This breakout detection is cleaner than EMA crossovers
 * (less lag) and more reliable than Bollinger squeeze (less noise). Combined with
 * RSI momentum confirmation, it avoids fake breakouts in choppy ranges.
 * When it buys and sells: BUY when price closes above the upper Donchian channel
 * (20-bar high) AND RSI > 55 (momentum confirmation). SELL when price closes below
 * the lower Donchian channel (20-bar low) OR RSI drops below 40.
 * When it does NOT work: In slow grinding uptrends where price never makes a
 * clean channel breakout — the strategy misses the early part of the move and
 * only enters on the first pullback after a breakout. Also fails in volatile
 * ranging markets where channels are wide and breakouts reverse quickly.
 */
function onUpdate(ctx) {
  const position = ctx.position;
  const price    = ctx.price;

  // ── Donchian Channel: 20-bar highest high and lowest low ─────────────
  let hh = 0, ll = Infinity;
  for (let i = 1; i <= 20; i++) {
    const h = ctx.high(1, i);   // closed bar i bars ago
    const l = ctx.low(1, i);
    if (h != null && h > hh) hh = h;
    if (l != null && l < ll) ll = l;
  }
  if (hh === 0 || ll === Infinity) return null;   // not enough bars yet

  // ── Momentum indicators ─────────────────────────────────────────────
  const rsi   = ctx.rsi(14, 1);
  const ema20 = ctx.ema(20, 1);
  if (rsi == null || ema20 == null) return null;

  // ── BUY: Breakout above upper Donchian + RSI confirm ─────────────────
  if (position === 0) {
    const breakoutUp   = price > hh;
    const rsiMomentum  = rsi > 55;
    const aboveEma     = price > ema20;
    if (breakoutUp && rsiMomentum && aboveEma) {
      ctx.log('BUY — Donchian breakout, RSI=' + rsi.toFixed(1) + ', HH=' + hh.toFixed(2));
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  // ── SELL: Below lower Donchian OR RSI weakening ─────────────────────
  if (position > 0) {
    const breakdownDown = price < ll;
    const rsiWeak       = rsi < 40;
    if (breakdownDown || rsiWeak) {
      ctx.log('SELL — breakdown or RSI weak, RSI=' + rsi.toFixed(1));
      return { side: 'sell', qty: position };
    }
  }

  return null;
}
