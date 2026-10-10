/*
 * @coinsori-strategy v1
 * name: SOL Regime-Switch Trend 1D
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: In a strong-trend asset like SOL the only reliable long-term signal is
 * the regime itself. Being fully invested while price stays above the 200-day average and
 * fully in cash when it breaks below is a simple, low-turnover way to ride bull markets and
 * step aside in bear markets. The exit is a trailing stop from the highest close since entry,
 * so normal bull-market pullbacks don't knock us out and we only lose when the trend really
 * turns.
 * When it buys and sells: Buys when the daily close rises above the 200-day average. Sells
 * when the daily close falls below the 200-day average, or when price falls 30% below the
 * highest daily close reached since entry (trailing stop that protects gains).
 * When it does NOT work: It gives back a large part of every peak before the 200-day line
 * confirms a top, and it re-enters late after a bottom. In a long sideways market it
 * whipsaws around the line. No data before Aug 2020.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma200 = ctx.sma(200, 1);   // 200-day average of the last CLOSED bar
  const lastClose = ctx.closes.at(-2);
  if (sma200 == null || lastClose == null) return null;

  const st = ctx.state;
  const pos = ctx.position;

  if (pos > 0) {
    // Track the highest close since entry (for the trailing stop)
    if (st.peakClose == null || lastClose > st.peakClose) st.peakClose = lastClose;
    // Trailing stop: exit if price falls 30% below the highest close reached since entry.
    // This is looser than SOL's normal bull pullbacks (which can be 25-30%) so winners
    // survive, but it still caps a crash. Replaces the fixed 25% entry stop that caused
    // 27 churn trades in 2022-24.
    const trail = st.peakClose * 0.70;
    ctx.watch([{ side: 'sell', price: trail, trigger: 'below', note: 'trail 30%' },
               { side: 'sell', price: lastClose < sma200 ? price : null, trigger: 'below', note: 'SMA200 break' }]);
    if (price <= trail) {
      return { side: 'sell', qty: pos };
    }
    // Exit to cash when the daily close breaks below the 200-day average
    if (lastClose < sma200) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Enter when the daily close rises above the 200-day average
  if (lastClose > sma200) {
    st.entryPx = price;
    st.peakClose = lastClose;
    const qty = (ctx.cash / price) * 0.9;
    return { side: 'buy', qty: qty };
  }
  return null;
}
