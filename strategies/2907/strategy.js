/*
 * @coinsori-strategy v1
 * name: ETH 4H Bollinger Mean-Reversion
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: On the 4-hour timeframe ETH swings hard between overbought and
 * oversold extremes around its moving average. Buying a sharp flush to the lower
 * Bollinger band and selling the snap-back to the middle band captures that
 * reversion — the same family that is the account's validated 1-day champion, but
 * on a faster timeframe with different regime exposure.
 * When it buys and sells: Buys only when price is above the 200-bar average (a
 * confirmed uptrend, so we are not catching a falling knife) AND touches the lower
 * Bollinger band (20-bar, 2.0 std) with RSI oversold (<35). Sells when price snaps
 * back up to the middle band (the 20-bar average). Position size is scaled by
 * volatility so a violent market risks a similar dollar amount per trade.
 * When it does NOT work: in a strong one-way trend price keeps riding the band and
 * the snap-back never comes; in a deep bear where price falls below the 200-bar
 * average it simply stops trading (stays in cash, which protects capital but misses
 * a recovery). It is a chop/uptrend-pullback strategy, not a trend-rider and not a
 * bear-market bottom-picker.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const bb = ctx.bb(20, 2.0, 1);
  const rsi = ctx.rsi(14, 1);
  const atr = ctx.atr(14, 1);
  const sma200 = ctx.sma(200, 1);
  if (bb == null || rsi == null || atr == null || sma200 == null || atr <= 0) return null;
  const mid = bb.mid;
  const lower = bb.lower;
  if (!Number.isFinite(mid) || !Number.isFinite(lower)) return null;

  const pos = ctx.position;
  const st = ctx.state;

  // Exit: sell when price snaps back up to the middle band (the mean we bet it reverts to).
  if (pos > 0) {
    if (price >= mid) {
      st.cd = ctx.i + 3; // small cooldown after a round trip to avoid immediate re-entry
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Cooldown: wait a few bars after a completed trade before buying again.
  if (st.cd != null && ctx.i < st.cd) return null;

  // Only mean-revert in an uptrend (price above 200-bar average) — avoids catching
  // the falling knife in a deep bear, which was the weakness of the no-gate version.
  if (price <= sma200) return null;

  // Entry: buy a flush to the lower band while RSI confirms oversold.
  if (price <= lower && rsi < 35) {
    st.cd = null;
    // ATR-scaled size: risk ~1.2% of equity per trade against the 2.0-sigma move.
    const riskEq = 0.012 * ctx.cash;
    const qty = riskEq / atr;
    const maxQty = ctx.cash / price * 0.9;
    return { side: 'buy', qty: Math.min(qty, maxQty) };
  }
  return null;
}
