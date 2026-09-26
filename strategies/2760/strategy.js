/*
 * @coinsori-strategy v1
 * name: Donchian Pullback Trend-Strength VolGate ETH 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Improvement on the trend-strength Donchian-pullback
 * champion (2759). Same trend-pullback family, but with a VOLUME gate added to
 * the entry: only buy a pullback that happens on SHRINKING volume. Bet: in a
 * genuine uptrend, a quiet pullback (low volume) is a healthy correction that
 * resumes; a loud pullback (surging volume) is distribution/panic where the
 * dip keeps falling — the champion's known weak spot in the recent choppy window.
 * When it buys and sells: buys when price pulls back to the lower 20-bar
 * Donchian channel, price above a RISING 200-SMA that rose >=0.15% over 5 bars,
 * AND current volume is below its 20-bar average (quiet pullback); sells at the
 * middle Donchian channel, when the 200-SMA stops rising, or on a 3x-ATR stop.
 * 5-bar cooldown.
 * When it does NOT work: same as the champion — below the 200-SMA it sits out;
 * in a fake/weak uptrend the pullback keeps going; the volume gate may skip
 * strong-volume capitulation bounces that would have been profitable.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const pos = ctx.position;
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 5);
  if (sma200 == null || sma200prev == null) return null;

  const uptrend = price > sma200 && sma200 > sma200prev;

  if (pos > 0) {
    const dcMid = (ctx.high(20, 1) + ctx.low(20, 1)) / 2;
    if (dcMid != null && price >= dcMid) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    if (!uptrend) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    const atr = ctx.atr(14, 1);
    if (atr != null && price <= ctx.entryPx - atr * 3) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const lastExit = ctx.state.lastExit || 0;
  if (ctx.i - lastExit < 5) return null;
  if (!uptrend) return null;

  const rise = (sma200 - sma200prev) / sma200prev;
  if (rise < 0.0015) return null;

  // VOLUME GATE: only buy a QUIET pullback. Current bar volume below the
  // 20-bar average means sellers are exhausted, not dumping. Skips panic dumps
  // that keep falling in the recent choppy window.
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(20);
  if (vol == null || avgVol == null || avgVol <= 0) return null;
  if (vol >= avgVol) return null;

  const dcLow = ctx.low(20, 1);
  if (dcLow != null && price <= dcLow * 1.01) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
