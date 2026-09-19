/*
 * @coinsori-strategy v1
 * name: Donchian Channel Trend Following
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Donchian channel breakouts capture sustained trending moves
 * by entering when price clears the N-bar highest high — a classic trend-following
 * signal with decades of documented edge. Different family entirely from the
 * failed RSI/EMA/funding-rate approach.
 * When it buys and sells: BUY when price closes above the 20-bar high (breakout
 * confirmed) with RSI > 50 (momentum present, not just a spike). SELL when
 * price closes below the 20-bar low (trend broken) or RSI > 75 (overextended).
 * When it does NOT work: Choppy markets where price whipsaws across the
 * channel — many small losses before a winning trend. Also fails in
 * low-volume conditions where breakouts lack follow-through.
 */
function onUpdate(ctx) {
  const position = ctx.position;
  const price    = ctx.price;

  // ── Donchian Channel: 20-bar highest high / lowest low ─────────────
  const dcLen = 20;
  const hi  = ctx.high(dcLen, 1);   // highest high of last 20 closed bars
  const lo  = ctx.low(dcLen, 1);    // lowest low  of last 20 closed bars
  if (hi == null || lo == null) return null;

  const aboveChannel = price > hi;  // breakout above 20-bar high
  const belowChannel = price < lo; // breakdown below 20-bar low

  // ── RSI: momentum confirmation (not entry trigger, just filter) ─────
  const rsi = ctx.rsi(14, 1);
  if (rsi == null) return null;
  const rsiConfirm = rsi > 50;   // bullish momentum present
  const rsiOverbought = rsi > 75; // take profit / exit signal

  // ── ATR: sanity-check volatility (avoid breakouts in illiquid spikes) ─
  const atr    = ctx.atr(14, 1);
  const atrPct = atr != null ? atr / price : null;
  const atrOk  = atrPct == null || atrPct < 0.06; // reject extreme vol

  // ── BUY: breakout above channel + momentum confirmed + ATR sane ──────
  if (position === 0) {
    if (aboveChannel && rsiConfirm && atrOk) {
      ctx.log('BUY — breakout above ' + dcLen + '-bar high=' + hi.toFixed(4) +
              ', RSI=' + rsi.toFixed(1));
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  // ── SELL: trend broken (below channel low) or overbought ─────────────
  if (position > 0) {
    if (belowChannel || rsiOverbought) {
      ctx.log('SELL — below channel low=' + lo.toFixed(4) +
              ' or RSI overbought=' + rsi.toFixed(1));
      return { side: 'sell', qty: position };
    }
  }

  return null;
}
