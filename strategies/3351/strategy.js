/*
 * @coinsori-strategy v1
 * name: SOL Regime-Switch Trend 1D
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: In a strong-trend asset like SOL the only reliable long-term signal is
 * the regime itself. Being fully invested while price stays above its 200-day average and
 * fully in cash when it breaks below is a simple, low-turnover way to ride bull markets and
 * step aside in bear markets — no breakout whipsaw, no short-term noise.
 * When it buys and sells: Buys when the daily close rises above the 200-day average. Sells
 * (to cash) when the daily close falls below the 200-day average. A hard 25% stop caps a
 * single bad entry.
 * When it does NOT work: It gives back a large part of every peak before the 200-day line
 * confirms a top, and it re-enters late after a bottom. In a long sideways market it
 * whipsaws around the line and bleeds fees. No data before Aug 2020.
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
    // Hard stop: a single catastrophic entry shouldn't sink the account (SOL can crash fast)
    if (st.entryPx != null && price <= st.entryPx * 0.75) {
      return { side: 'sell', qty: pos };
    }
    ctx.watch([{ side: 'sell', price: lastClose < sma200 ? price : null, trigger: 'below', note: 'SMA200 break' }]);
    // Exit to cash when the daily close breaks below the 200-day average
    if (lastClose < sma200) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Enter when the daily close rises above the 200-day average
  if (lastClose > sma200) {
    st.entryPx = price;
    const qty = (ctx.cash / price) * 0.9;
    return { side: 'buy', qty: qty };
  }
  return null;
}
