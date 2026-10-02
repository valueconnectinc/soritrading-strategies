/*
 * @coinsori-strategy v1
 * name: SOL 1D Defensive MR with ATR-Trail
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The ledger validated defensive mean-reversion on SOL 1D (buy dips in
 * an uptrend) and separately showed that an ATR-trailing stop cuts drawdown sharply on a
 * multi-asset basket. This combines the two: the proven BB-low + RSI entry inside a rising
 * 200-day gate, but exits on a 3x ATR trail from the highest close since entry instead of
 * the champion's EMA20 snap-back, so winners keep more of their move while reversals are cut.
 * When it buys and sells: buy when price closes below the lower Bollinger (20,2) with
 * RSI(14)<30, only while the 200-day average is rising. Sell when price closes below the
 * trailing stop (3x ATR below the highest close since entry) or when the 200-day trend turns
 * down. One position at a time, sized from the full cash balance.
 * When it does NOT work: in a broad coordinated bear the rising-trend gate keeps it flat
 * (capital safe, little upside); in a straight-line melt-up it lags buy-and-hold; the trail
 * can give back gains in a choppy recovery.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  const atr = ctx.atr(14, 1);
  if (bb == null || rsi == null || sma200 == null || sma200prev == null || atr == null || atr <= 0) return null;

  const uptrend = sma200 > sma200prev;
  const pos = ctx.position;

  if (pos > 0) {
    const peak = ctx.state.peak != null ? Math.max(ctx.state.peak, price) : price;
    ctx.state.peak = peak;
    const trailStop = peak - 3 * atr; // 3 ATR below the peak: let winners run, cut reversals
    if (price < trailStop || !uptrend) {
      ctx.state.peak = null;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (!uptrend) return null;

  const flush = price < bb.lower && rsi < 30; // deep oversold dip inside an uptrend
  if (flush) {
    const qty = (ctx.cash / price) * 0.99;
    if (qty <= 0) return null;
    ctx.state.peak = price;
    return { side: 'buy', qty: qty };
  }
  return null;
}
