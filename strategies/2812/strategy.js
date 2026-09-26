/*
 * @coinsori-strategy v1
 * name: ETH 4H Band-Bounce Champion + Fed Tightening Gate
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The band-bounce mean-reversion champion (buy panic dips to
 * the lower Bollinger band with oversold RSI, above a 200-SMA uptrend) is the
 * most validated family in the ledger — defensive, low drawdown across 14
 * assets. Its one weakness is that it still buys dips that keep falling in a
 * strong macro downtrend. This adds a monetary-policy gate: when the Fed is
 * actively raising rates (a tightening cycle), it stands aside in cash instead
 * of catching falling knives. This is different from a price-trend filter —
 * the fed gate is rare and slow, so it should not over-filter like fear/greed did.
 * When it buys and sells: buys a panic dip (price below the lower Bollinger
 * band, RSI<30, price above the 200-SMA) and sells at the mid-band or when RSI
 * recovers above 50 (or a 6-ATR stop). But it takes NO buy while the fed funds
 * rate is more than ~0.5pp above its level ~30 days earlier.
 * When it does NOT work: in a prolonged tightening cycle it stays in cash and
 * misses genuine panic-bottom bounces; and if the Fed is on hold during a
 * non-policy-driven crash (e.g. a leverage flush), the champion's normal
 * drawdown weakness returns.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const fedNow = ctx.data('fed');
  const fedLag = ctx.data('fed_lag30');
  if (fedNow == null || fedLag == null) return null;
  // Tightening = current rate meaningfully above its level ~30 rows ago.
  const tightening = fedNow > fedLag + 0.5;

  const pos = ctx.position;

  // Exit handling first.
  if (pos > 0) {
    const bb = ctx.bb(20, 2, 1);
    const rsi = ctx.rsi(14, 1);
    const atr = ctx.atr(14, 1);
    if (bb == null || rsi == null || atr == null) return null;
    const mid = bb.mid;
    const entry = ctx.entryPx;
    // Exit at mid-band, on RSI recovery above 50, or a 6-ATR stop from entry.
    if (price >= mid || rsi > 50 || (entry != null && price <= entry - 6 * atr)) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Stand aside entirely during an active Fed tightening cycle.
  if (tightening) return null;

  // Entry: panic dip to lower band + oversold, but only in an uptrend.
  const sma200 = ctx.sma(200, 1);
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  if (sma200 == null || bb == null || rsi == null) return null;
  if (price <= sma200) return null; // only buy above the long uptrend
  if (price > bb.lower) return null; // must be at/below the lower band
  if (rsi >= 30) return null; // must be oversold

  // 5-bar cooldown after any recent trade to avoid re-entry whipsaw.
  const lastTrade = ctx.state.lastTradeBar != null ? ctx.state.lastTradeBar : -1e9;
  if (ctx.i - lastTrade < 5) return null;
  ctx.state.lastTradeBar = ctx.i;

  return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
}
