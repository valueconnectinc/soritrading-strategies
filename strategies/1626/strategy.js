/*
 * @coinsori-strategy v1
 * name: DXY Macro Regime + RSI Pullback
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 1000
 *
 * Trades SOLUSDT long only. Uses the US Dollar Index (DXY) as a macro regime filter:
 * when the dollar is weakening (risk-on), the strategy enters on RSI pullbacks;
 * when the dollar strengthens (risk-off), it exits and stays flat.
 * This anchors entries to a fundamental macro context rather than pure price action.
 * Works best in trending crypto markets with clear dollar cycles.
 * Loses when DXY and crypto decouple (e.g. USD-specific crypto news) or in choppy,
 * low-volume ranges where RSI oscillates without trend.
 */

function onUpdate(ctx) {
  // ── Warm-up ───────────────────────────────────────────────────────────────
  const ema20 = ctx.ema(20);
  if (ema20 == null) return null;

  // ── DXY macro regime ──────────────────────────────────────────────────────
  // ctx.macro('dxy') returns the latest daily DXY close.
  // Risk-on  = DXY falling or below its short SMA  → allow longs.
  // Risk-off = DXY rising  or above its short SMA  → stay flat.
  const dxy = ctx.macro('dxy');
  if (dxy == null) return null;

  // Use DXY change over last 2 closed bars to detect direction.
  // ago=1 = previous closed bar, ago=2 = the one before that.
  const dxyChg1 = ctx.change(1, 1); // DXY change, previous bar
  const dxyChg2 = ctx.change(1, 2); // DXY change, bar before that

  // Regime: DXY is bearish (falling) when both recent changes are negative,
  // OR when DXY is below its own SMA(3) from macroSeries.
  let dxyBearish = false;
  if (dxyChg1 != null && dxyChg2 != null) {
    dxyBearish = (dxyChg1 < 0 && dxyChg2 < 0);
  }
  // Secondary check via macroSeries SMA(3)
  const dxySer = ctx.macroSeries;
  if (!dxyBearish && dxySer && dxySer.length >= 3) {
    const s = dxySer.slice(-3);
    const sma3 = (s[0] + s[1] + s[2]) / 3;
    dxyBearish = dxy < sma3;
  }

  // ── RSI ───────────────────────────────────────────────────────────────────
  const rsi  = ctx.rsi(14);
  const rsi1 = ctx.rsi(14, 1);
  const rsi2 = ctx.rsi(14, 2);
  if (rsi == null || rsi1 == null || rsi2 == null) return null;

  // Pullback: RSI was healthy (> 45) two bars ago, dipped into 35-42 range,
  // and is now turning back up — classic mean-reversion entry.
  const rsiPullback = rsi2 > 45 && rsi1 >= 35 && rsi1 <= 42 && rsi > rsi1;

  // ── Trend ─────────────────────────────────────────────────────────────────
  const price     = ctx.price;
  const bullTrend = price > ema20; // price above EMA = short-term uptrend

  // ── Entry ─────────────────────────────────────────────────────────────────
  if (!ctx.position && dxyBearish && bullTrend && rsiPullback) {
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }

  // ── Exit ───────────────────────────────────────────────────────────────────
  if (ctx.position) {
    // Take profit: RSI overbought
    if (rsi > 68) {
      return { side: 'sell', qty: ctx.position };
    }
    // Stop loss: trend failure — RSI collapsed to oversold
    if (rsi < 28) {
      return { side: 'sell', qty: ctx.position };
    }
    // Regime shift: DXY just flipped from falling to rising — risk-off, exit
    const dxyChgNow = ctx.change(1, 0);
    if (dxyChgNow != null && dxyChg1 != null && dxyChgNow > 0 && dxyChg1 <= 0) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
