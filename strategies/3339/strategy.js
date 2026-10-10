/*
 * @coinsori-strategy v1
 * name: BTC Network Adoption Trend 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Rising network usage (daily active addresses) usually accompanies or leads
 * a BTC uptrend — growing adoption is a fundamental tailwind. Combined with price above the
 * 200-day average, this bets on adoption-driven bull markets.
 * When it buys and sells: Buys when active addresses are above their 30-day average (network
 * growing) AND price is above the 200-day average. Fundamentals only decide WHEN to be in the
 * market; price manages the exit — it sells when price breaks the 200-day average or a 20%
 * stop hits, so it does not churn on every one-day address dip.
 * When it does NOT work: In a bear market addresses keep falling so it stays mostly flat (it does
 * not short, so it cannot profit from the fall). If active-address data is missing on a day it
 * simply does nothing. A 20% stop caps but cannot prevent losses on sudden crashes.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const pos = ctx.position;
  // on-chain values from the user's connected DB (null if DB unreachable)
  const addr = ctx.data('addr');
  const addr30 = ctx.data('addr_sma30');
  const sma200 = ctx.sma(200, 1);
  if (price == null || addr == null || addr30 == null || sma200 == null) return null;

  const st = ctx.state;

  if (pos <= 0) {
    // Adoption growth + uptrend = the whole signal. No extra filters.
    if (addr > addr30 && price > sma200) {
      st.stopPx = price * 0.80;    // 20% hard stop: trend entries can retrace hard before resuming
      ctx.watch([{ side: 'sell', price: price * 0.80, trigger: 'below', note: '20% stop' }]);
      return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
    }
    return null;
  }

  const entry = ctx.entryPx || price;
  const stopPx = st.stopPx || entry * 0.80;
  ctx.watch([{ side: 'sell', price: stopPx, trigger: 'below', note: '20% stop' },
             { side: 'sell', price: sma200, trigger: 'below', note: 'trend break' }]);
  // Price manages the exit: trend break or hard stop. Fundamentals only gate the entry.
  if (price < sma200 || price <= stopPx) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
