/*
 * @coinsori-strategy v1
 * name: Volume-Confirmed Tight Breakout
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: A 10-bar Donchian is faster than 20-bar — it catches
 * shorter-term momentum bursts. Volume surge confirms the breakout is
 * institutional, not a false spike. EMA20 keeps us on the right side of
 * the major trend. This combination (tight channel + volume + EMA) is
 * NEW to this job — pure breakout (20-bar) failed, volume may filter
 * the false signals.
 *
 * When it buys and sells:
 *   Buy: price > 10-bar high + volume > 1.5× avgVol(10) + EMA20 rising
 *   Sell: price < 10-bar low OR ATR×1.5 trailing stop OR RSI < 40
 *
 * When it does NOT work: low-volume breakouts in illiquid periods.
 * Also fails when volume surges but price immediately reverses (capitulation).
 */
function onUpdate(ctx) {
  const pos   = ctx.position;
  const price = ctx.price;

  // ── Warm-up guard ────────────────────────────────────────────────────
  const atr     = ctx.atr(14);
  const ema20   = ctx.ema(20);
  const ema20_1 = ctx.ema(20, 1);
  const rsi     = ctx.rsi(14);
  const avgVol  = ctx.avgVol(10);
  if (atr == null || ema20 == null || ema20_1 == null || rsi == null || avgVol == null || avgVol === 0) return null;

  // ── Tight 10-bar Donchian (previous closed bar) ─────────────────────
  const dcHigh = ctx.high(10, 1);
  const dcLow   = ctx.low(10, 1);
  if (dcHigh == null || dcLow == null) return null;

  // ── Volume surge: current bar volume > 1.5× 10-bar average ─────────
  const volSurge = ctx.vol > 1.5 * avgVol;

  // ── Trend filter ─────────────────────────────────────────────────────
  const emaRising = ema20 > ema20_1;

  // ── State ────────────────────────────────────────────────────────────
  if (!ctx.state.highest) ctx.state.highest = 0;

  // ── BUY ─────────────────────────────────────────────────────────────
  if (pos === 0) {
    const breakout   = price > dcHigh;
    const rsiConfirm = rsi > 45 && rsi < 75; // avoid overbought entries
    if (breakout && volSurge && emaRising && rsiConfirm) {
      ctx.state.highest = price;
      ctx.log('BUY breakout vol=' + ctx.vol.toFixed(0) + ' avg=' + avgVol.toFixed(0) + ' RSI=' + rsi.toFixed(1));
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  // ── HOLD: trailing ATR stop ───────────────────────────────────────────
  if (pos > 0) {
    if (price > ctx.state.highest) ctx.state.highest = price;
    const atrStop = ctx.state.highest - 1.5 * atr; // tighter 1.5× ATR stop

    const belowChannel = price < dcLow;
    const rsiWeak      = rsi < 40;
    const atrTrailing  = price < atrStop && atrStop > 0;

    if (belowChannel || rsiWeak || atrTrailing) {
      ctx.state.highest = 0;
      const reason = belowChannel ? 'below-channel' : rsiWeak ? 'RSIweak' : 'ATRstop';
      ctx.log('SELL ' + reason + ' price=' + price.toFixed(1));
      return { side: 'sell', qty: pos };
    }
  }

  return null;
}
