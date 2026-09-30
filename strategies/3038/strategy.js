/*
 * @coinsori-strategy v1
 * name: BTC 1D Fast-Momentum Trend Ride
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated defensive mean-reversion champion (3037) is
 * excellent in pullbacks and bears but LAGS buy-and-hold in relentless melt-ups
 * because it only buys weakness and sells on every snap-back. This is the
 * complementary family: it BUYS STRENGTH and RIDES the trend, using a fast
 * 50-day EMA trend gate (not the slow 200-day) so it enters rallies earlier,
 * and inverse-ATR sizing to keep drawdown controlled where pure momentum
 * strategies bleed out.
 * When it buys and sells: Buys when price is above the 50-day EMA AND 20-day
 * momentum is positive (price rising over 20 bars) — a confirmed short-term
 * uptrend. Sizes inversely to ATR (bigger when calm, smaller when wild). Sells
 * when price closes back below the 50-day EMA (the trend broke) or when 20-day
 * momentum turns clearly negative.
 * When it does NOT work: In a choppy sideways market the fast EMA whipsaws in
 * and out. It buys tops near the end of a melt-up and holds through the early
 * part of a crash until the 50-day EMA breaks, so it loses more than the
 * defensive MR champion in sharp reversals. Not a bear-market strategy.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const ema50 = ctx.ema(50, 1);
  const roc20 = ctx.change(20, 1); // % change over 20 bars on the closed bar
  const atr = ctx.atr(14, 1);
  if (ema50 == null || roc20 == null || atr == null || atr <= 0) return null;

  // Trend broken: close below the 50-day EMA -> exit the long.
  if (pos > 0) {
    if (price < ema50 || roc20 < -5) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Only long when price is above the 50-day EMA (bull regime gate).
  if (price <= ema50) return null;

  // Enter on confirmed short-term momentum: price rising over 20 bars.
  if (roc20 > 0) {
    // Inverse-ATR sizing: risk 2.5% of cash per ATR of adverse move.
    const riskBudget = 0.025 * ctx.cash;
    let qty = riskBudget / atr;
    const maxQty = (ctx.cash / price) * 0.95;
    qty = Math.min(qty, maxQty);
    if (qty <= 0) return null;
    return { side: 'buy', qty: qty };
  }
  return null;
}
