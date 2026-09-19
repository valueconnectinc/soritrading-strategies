/*
 * @coinsori-strategy v1
 * name: EMA Crossover + RSI Filter + ATR Stop — SUIUSDT 4H
 * ex: binance
 * syms: SUIUSDT
 * interval: 4h
 * cash: 1000
 *
 * Why this strategy: SUI is a high-beta altcoin that trends in bursts.
 * EMA crossovers catch those trending moves with less lag than SMAs.
 * RSI filters out noisy whipsaws in choppy markets.
 * When it buys and sells: Buy on EMA(8,21) golden cross + RSI > 50 (trend
 * confirmation — no entry if RSI is still bearish). Sell on death cross OR
 * when price retraces 2× ATR from peak (trailing ATR exit).
 * When it does NOT work: In low-volatility chop SUI does for weeks, EMA
 * crossovers fire repeatedly and each small loss compounds. Also fails if
 * SUI pumps and immediately dumps — ATR stop may not catch the reversal fast enough.
 */
function onUpdate(ctx) {
  // EMA crossover — need enough bars
  const ema8  = ctx.ema(8);
  const ema21 = ctx.ema(21);
  if (ema8 == null || ema21 == null) return null;

  const ema8Prev  = ctx.ema(8, 1);
  const ema21Prev = ctx.ema(21, 1);
  if (ema8Prev == null || ema21Prev == null) return null;

  // RSI for trend confirmation
  const rsi = ctx.rsi(14);
  if (rsi == null) return null;

  const price    = ctx.price;
  const position = ctx.position;
  const atr      = ctx.atr(14);
  const avgVol   = ctx.avgVol(20);
  if (atr == null || avgVol == null) return null;

  // ── ENTRY: EMA golden cross + RSI confirming uptrend ──────────────────
  if (!position) {
    const crossUp = ema8Prev <= ema21Prev && ema8 > ema21;
    // Only enter if RSI is above 50 — no entry during bearish momentum
    if (crossUp && rsi > 50) {
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  // ── EXIT: EMA death cross OR trailing ATR stop ─────────────────────────
  if (position) {
    const crossDown = ema8Prev >= ema21Prev && ema8 < ema21;

    // Trailing ATR stop: track peak price, exit if price drops 2× ATR from peak
    // ctx.uPnl is unrealised P&L; use it as a proxy for drawdown from peak
    const atrStop = atr != null && ctx.uPnl < -2 * atr * ctx.position;

    if (crossDown || atrStop) {
      return { side: 'sell', qty: position };
    }
  }

  return null;
}
