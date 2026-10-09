/*
 * @coinsori-strategy v1
 * name: XRP 4H Keltner MR Trend-Gated Vol-Target
 * ex: binance
 * syms: XRPUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: oversold bounces in an uptrend are the validated edge in this
 * account. Adding a 200-bar trend gate and ATR-based position sizing targets the
 * family's known weakness — 22-49% drawdown from staying fully invested in
 * volatile alts.
 * When it buys and sells: buys when a closed bar closes below the lower Keltner
 * band (EMA20 - 2.5x ATR) AND RSI<40 AND price is above its 200-bar average.
 * Sells when price returns to the mid band or RSI recovers above 60. 2-bar
 * cooldown after each exit.
 * When it does NOT work: in a strong downtrend the trend gate keeps it out but the
 * gate also delays re-entry after a reversal; in chop the cooldown and tight RSI
 * thresholds cut trade frequency. Vol-target sizing means it can never match a
 * full-cash run's upside in a clean bull.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  const price = ctx.price;
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  if (ema20 == null || atr == null || rsi == null || sma200 == null) return null;
  if (closes.length < 2) return null;
  const prev = closes[closes.length - 2];

  const lower = ema20 - 2.5 * atr;
  const pos = ctx.position;
  const cd = (ctx.state.cd || 0);
  if (cd > 0) ctx.state.cd = cd - 1;

  // EXIT: bounce back to mid band or RSI recovered; then 2-bar cooldown
  if (pos > 0) {
    if (prev >= ema20 || rsi > 60) {
      ctx.state.cd = 2;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (cd > 0) return null;
  // ENTRY: below lower band + oversold + uptrend gate (no falling knives)
  if (prev < lower && rsi < 40 && prev > sma200) {
    // risk 2% of equity on a 2.5x ATR adverse move, capped at full cash
    const qty = Math.min(ctx.cash * 0.02 / (2.5 * atr), ctx.cash / price * 0.99);
    if (qty <= 0) return null;
    return { side: 'buy', qty };
  }
  return null;
}
