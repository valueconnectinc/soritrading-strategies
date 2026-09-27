/*
 * @coinsori-strategy v1
 * name: Keltner MR Daily + Hard Stop
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated Keltner mean-reversion champion buys a deep
 * flush to the lower band and holds until snap-back above the middle band. Its
 * one weakness is tail risk: if the flush keeps falling in a sustained bear,
 * there is no stop and the position rides underwater. This version adds a hard
 * ATR-scaled stop below entry to cap that tail while keeping the mean-reversion
 * edge intact.
 * When it buys and sells: buys a flush to the lower Keltner band (EMA20 - 2.5x
 * ATR) with RSI<40 while price is above the 200-day average; sells on the
 * snap-back to the middle band (EMA20) OR when price falls 2x ATR below the
 * entry (protective stop). A 2-bar cooldown prevents re-buying.
 * When it does NOT work: in a persistent downtrend below the 200-day average it
 * stays idle, and it lags straight-line melt-ups (few deep flushes to catch).
 * The stop can also sell right before a V-shaped recovery in violent crashes.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const sma200 = ctx.sma(200, 1);
  const rsi = ctx.rsi(14, 1);
  if (ema20 == null || atr == null || sma200 == null || rsi == null || atr <= 0) return null;

  const lower = ema20 - 2.5 * atr;
  const st = ctx.state;

  if (pos > 0) {
    // Hard protective stop: exit if price falls 2 ATR below the entry level.
    // 2 ATR gives the mean-reversion room to breathe while capping the tail;
    // tighter stops whipsaw (ledger: trailing stops hurt this recipe).
    if (st.stopPx != null && price <= st.stopPx) {
      st.cooldown = ctx.i + 2;
      st.stopPx = null;
      return { side: 'sell', qty: pos };
    }
    if (price > ema20) {
      st.cooldown = ctx.i + 2;
      st.stopPx = null;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (st.cooldown != null && ctx.i < st.cooldown) return null;

  if (price > sma200 && price <= lower && rsi < 40) {
    st.cooldown = null;
    st.stopPx = price - 2 * atr;
    // ATR-scaled size: risk 1.5% of equity per trade, in coin units.
    const riskEq = 0.015 * ctx.cash;
    const qty = riskEq / atr;
    const maxQty = ctx.cash / price * 0.9;
    return { side: 'buy', qty: Math.min(qty, maxQty) };
  }
  return null;
}
