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
 * When it buys and sells: Buys when price touches the lower Bollinger band (20-bar,
 * 2.0 std) while RSI is oversold (<35), and sells when price snaps back up to the
 * middle band (the 20-bar average). Position size is scaled by volatility so a
 * violent market risks a similar dollar amount per trade.
 * When it does NOT work: in a strong one-way trend (a relentless melt-up or melt-down)
 * price keeps riding the lower/upper band and the snap-back never comes, so the
 * strategy stays out or gives back gains; it also whipsaws in a tight sideways range
 * where price touches the band but does not mean-revert. It is a chop/bear-market
 * strategy, not a trend-rider.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const bb = ctx.bb(20, 2.0, 1);
  const rsi = ctx.rsi(14, 1);
  const atr = ctx.atr(14, 1);
  if (bb == null || rsi == null || atr == null || atr <= 0) return null;
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
