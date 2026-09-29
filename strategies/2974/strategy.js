/*
 * @coinsori-strategy v1
 * name: BTC 1D Fear-Greed Contrarian v3
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The crypto Fear & Greed Index is a crowd-sentiment gauge.
 * Only EXTREME fear (a true capitulation print) marks a good contrarian entry;
 * anything less is noise that causes overtrading. This version keeps the
 * sentiment family but fixes the churn of v2 by requiring a much deeper fear
 * threshold, holding through small dips (exit only on a real 50-day trend
 * break), and adding a cooldown after each exit.
 * When it buys and sells: Buys only when the index is at or below 15 (extreme
 * fear) while price is above a rising 200-day average. Holds and only sells
 * when price closes below the 50-day average (a genuine trend break) or when
 * sentiment reaches euphoric greed (above 80). A cooldown prevents re-entering
 * right after a loss.
 * When it does NOT work: In a long bear market extreme fear can persist while
 * price keeps falling — the 200-day gate keeps us out so we capture little.
 * Extreme-fear prints are rare, so trade count is low and each trade carries
 * the full risk of a failed capitulation.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const st = ctx.state;
  const fg = ctx.data('fear_greed');
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  const sma50 = ctx.sma(50, 1);
  if (fg == null || sma200 == null || sma50 == null) return null;

  const uptrend = sma200prev != null && sma200 > sma200prev;

  if (pos > 0) {
    // Exit on a real 50-day trend break, or euphoric greed. Hold through dips.
    if (price < sma50) {
      st.cd = ctx.i + 5;
      return { side: 'sell', qty: pos };
    }
    if (fg > 80) {
      st.cd = ctx.i + 5;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Cooldown: wait 5 bars after an exit before re-entering.
  if (st.cd != null && ctx.i < st.cd) return null;

  // Only EXTREME fear (<=15) triggers a buy, and only in an uptrend.
  if (uptrend && fg <= 15) {
    st.cd = null;
    return { side: 'buy', qty: (ctx.cash / price) * 0.9 };
  }
  return null;
}
