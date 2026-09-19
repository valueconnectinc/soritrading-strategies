/*
 * @coinsori-strategy v1
 * name: Stochastic Mean Reversion + EMA Trend Filter
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Stochastic Oscillator mean reversion is a classic
 * counter-trend approach — %K below 20 = oversold, expecting a bounce.
 * The EMA50 filter prevents buying in downtrends (where oversold can stay
 * oversold indefinitely). This combination is NEW to this job — RSI, BB,
 * and EMA crossover have been tested, but Stochastic mean reversion has not.
 *
 * When it buys and sells:
 *   Buy: %K crosses above 20 (oversold exit) + price > EMA50 + ATR stable
 *   Sell: %K reaches 80 (overbought) OR price falls below EMA50 OR ATR×2 stop
 *
 * When it does NOT work: strong trending markets where oversold readings
 * persist for long periods. Also fails when ATR is high (wide stops, small position).
 */
function onUpdate(ctx) {
  const pos   = ctx.position;
  const price = ctx.price;

  // ── Warm-up guard ────────────────────────────────────────────────────
  const stoch = ctx.stoch(14, 3); // {k, d} — slow stochastic
  const ema50 = ctx.ema(50);
  const ema50_1 = ctx.ema(50, 1);
  const atr   = ctx.atr(14);
  const atr_1 = ctx.atr(14, 1);
  if (stoch == null || stoch.k == null || stoch.d == null ||
      ema50 == null || ema50_1 == null || atr == null || atr_1 == null) return null;

  const k  = stoch.k;
  const d  = stoch.d;
  const k1 = ctx.stoch(14, 3, 1);
  const d1 = ctx.stoch(14, 3, 1);
  if (k1 == null || k1.k == null || d1 == null || d1.k == null) return null;

  // ── EMA trend: price above EMA50 = uptrend ───────────────────────────
  const emaBullish = price > ema50;

  // ── ATR stability: volatility should be stable (not expanding) ────────
  const atrStable = atr <= atr_1 * 1.2; // not expanding more than 20%

  // ── State ────────────────────────────────────────────────────────────
  if (!ctx.state.entryPx) ctx.state.entryPx = 0;
  if (!ctx.state.highest) ctx.state.highest = 0;

  // ── BUY: stochastic exits oversold zone + EMA confirms uptrend ────────
  if (pos === 0) {
    // %K crosses above 20 from below (oversold exit)
    const kCrossUp   = k1.k < 20 && k > 20;
    const dConfirm   = d > d1.d; // %D also rising (confirmation)
    if (kCrossUp && dConfirm && emaBullish && atrStable) {
      ctx.state.entryPx = price;
      ctx.state.highest = price;
      ctx.log('BUY stoch exit oversold k=' + k.toFixed(1) + ' d=' + d.toFixed(1));
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  // ── HOLD: ATR trailing stop ────────────────────────────────────────────
  if (pos > 0) {
    if (price > ctx.state.highest) ctx.state.highest = price;
    const atrStop = ctx.state.highest - 2 * atr;

    const overbought = k > 80; // stochastic reaches overbought → take profit
    const emaBreak   = price < ema50; // trend reverses
    const atrStopHit = price < atrStop && atrStop > 0;

    if (overbought || emaBreak || atrStopHit) {
      ctx.state.entryPx = 0;
      ctx.state.highest = 0;
      const reason = overbought ? 'overbought' : emaBreak ? 'EMAbreak' : 'ATRstop';
      ctx.log('SELL ' + reason + ' price=' + price.toFixed(1));
      return { side: 'sell', qty: pos };
    }
  }

  return null;
}
