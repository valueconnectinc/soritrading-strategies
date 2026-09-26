/*
 * @coinsori-strategy v1
 * name: Donchian Pullback Trend-Strength ETH 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Improvement on the validated Donchian-pullback champion
 * (2754). Same trend-pullback family, but with a trend-strength gate added to
 * the ENTRY so it stops buying pullbacks in flat/choppy regimes where the
 * pullback keeps falling (the champion's known weak spot on the recent window).
 * Bet: in a genuinely rising uptrend, pullbacks to the lower Donchian channel
 * resume; requiring the 200-SMA to be rising meaningfully filters out the
 * sideways traps.
 * When it buys and sells: buys when price pulls back to the lower 20-bar
 * Donchian channel, price is above the 200-SMA, the 200-SMA is rising, AND the
 * 200-SMA has risen at least 0.15% over the last 5 bars (trend strength);
 * sells at the middle Donchian channel, when the 200-SMA stops rising, or on a
 * 3x-ATR stop. 5-bar cooldown.
 * When it does NOT work: same as the champion — below the 200-SMA it sits out;
 * in a fake/weak uptrend the pullback keeps going; the extra gate means it may
 * miss early pullbacks in a fresh but still-flat trend.
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

  // TREND-STRENGTH GATE: 200-SMA must be rising at least 0.15% over 5 bars.
  // Chosen so a flat/choppy SMA (which barely moves) blocks the entry that
  // would otherwise catch a falling knife in the recent choppy window.
  const rise = (sma200 - sma200prev) / sma200prev;
  if (rise < 0.0015) return null;

  const dcLow = ctx.low(20, 1);
  if (dcLow != null && price <= dcLow * 1.01) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
