/*
 * @coinsori-strategy v1
 * name: BTC 1D Dual-MR + Dollar Risk-Off Gate
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated BTC 1D Dual-MR champion (3007) already holds up well
 * in bears, but its worst window (2017-21) still took an 18% drawdown. This version adds
 * a macro risk-off filter: it blocks mean-reversion BUYS when the US Dollar Index is
 * rising sharply (a risk-off regime that historically drags on crypto). The dollar gate is
 * a filter on top of the proven champion core — it should cut drawdown without removing
 * the profitable deep-oversold flushes that happen in risk-on conditions.
 * When it buys and sells: Same as the champion — buy on a Bollinger-RSI flush OR an
 * ATR-Keltner pullback inside a rising 200-day trend, but ONLY if the dollar is not in a
 * sharp uptrend. Sell on the snap-back above the 20-day EMA or RSI>55.
 * When it does NOT work: If DXY is unavailable the gate is skipped (falls back to the
 * champion). The dollar gate can wrongly block good flush buys if the dollar is spiking
 * while BTC is genuinely oversold, and it lags in relentless melt-ups like the champion.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const bb = ctx.bb(20, 2.5, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  if (bb == null || rsi == null || sma200 == null || sma200prev == null || ema20 == null || atr == null || atr <= 0) return null;

  // --- Macro risk-off gate: block BUYS when the dollar is rising sharply. ---
  let riskOff = false;
  const dxy = ctx.macro('dxy');
  if (dxy != null) {
    const dxyVal = (typeof dxy === 'object') ? (dxy.value != null ? dxy.value : dxy.close) : dxy;
    if (Number.isFinite(dxyVal) && dxyVal > 0) {
      const prev = ctx.state.dxyFast;
      const fast = (prev != null) ? prev * 0.9 + dxyVal * 0.1 : dxyVal;
      const slow = (ctx.state.dxySlow != null) ? ctx.state.dxySlow * 0.98 + dxyVal * 0.02 : dxyVal;
      ctx.state.dxyFast = fast;
      ctx.state.dxySlow = slow;
      // Risk-off only when the dollar is clearly rising (fast above slow by a small margin).
      riskOff = (prev != null) && (fast > slow * 1.002);
    }
  }

  const uptrend = sma200 > sma200prev;
  const lowerBand = bb.lower;
  const keltnerLow = ema20 - 2.5 * atr;

  if (pos > 0) {
    if (price > ema20 || rsi > 55) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (!uptrend) return null;
  // The macro gate: skip flush buys in a sharp dollar uptrend (risk-off).
  if (riskOff) return null;

  const bollingerFlush = price < lowerBand && rsi < 30;
  const keltnerPullback = price < keltnerLow && rsi < 40;
  if (bollingerFlush || keltnerPullback) {
    const qty = (ctx.cash / price) * 0.95;
    return { side: 'buy', qty: qty };
  }
  return null;
}
