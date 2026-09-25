/*
 * @coinsori-strategy v1
 * name: BNB 4H Band-Bounce Mean Reversion
 * ex: binance
 * syms: BNBUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: On the 4h timeframe, liquid alts like BNB mean-revert
 *   around their moving average more than they trend — sharp drops below the
 *   lower Bollinger band with an oversold RSI tend to bounce back to the middle
 *   band. This family is the documented defensive winner on LTC/XRP/DOT 4h.
 * When it buys and sells: Buy when the last closed price closes below the lower
 *   Bollinger band AND RSI is oversold (< 30) — a capitulation dip. Sell when
 *   price climbs back up to the middle band (SMA20) or RSI turns neutral (> 50),
 *   or bail out if price keeps falling past a stop.
 * When it does NOT work: In strong one-way trends (a long melt-up or a sustained
 *   crash) the dip keeps dipping — it catches falling knives and underperforms
 *   buy-and-hold. It is long-only, so it misses short-side profits in bears.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma20 = ctx.sma(20, 1);
  if (bb == null || rsi == null || sma20 == null) return null;

  const px = ctx.closes[ctx.closes.length - 1]; // last CLOSED bar
  const pos = ctx.position;

  // Exit: price back to the middle band, or RSI no longer oversold.
  if (pos > 0) {
    if (px >= sma20 || rsi > 50) return { side: 'sell', qty: pos };
    // Hard stop: price fell 6% below entry — bail out of a broken bounce.
    if (ctx.entryPx != null && px < ctx.entryPx * 0.94) return { side: 'sell', qty: pos };
    return null;
  }

  // Enter: close below the lower band AND RSI oversold — a capitulation dip.
  if (px < bb.lower && rsi < 30) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }

  return null;
}
