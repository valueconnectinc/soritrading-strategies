/*
 * @coinsori-strategy v1
 * name: ETH 4H Stochastic Mean-Reversion
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Mean-reversion works on 4h bars (the band-bounce champion
 * proves it), but that champion uses Bollinger bands + RSI. This tests a
 * DIFFERENT oversold indicator — the stochastic oscillator — to see if a
 * separate confirmation of the same panic-flush edge adds robustness. It buys
 * only when the stochastic is deeply oversold AND price is still above the
 * 200-bar average (no falling knives), and sells on the snap-back.
 * When it buys and sells: buys when the %K line is below 20 (deep oversold)
 * and price is above the 200-bar average; sells when the stochastic recovers
 * above 50 or price returns to the middle Bollinger band.
 * When it does NOT work: in a persistent downtrend below the 200-bar average
 * the oversold readings stay oversold and it never buys (safe but idle), and
 * in a straight-line melt-up there are no deep oversold flushes to catch.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const st = ctx.stoch(14, 3, 1);
  const sma200 = ctx.sma(200, 1);
  const bb = ctx.bb(20, 2, 1);
  if (st == null || sma200 == null || bb == null) return null;

  if (pos > 0) {
    // Exit on snap-back: stochastic recovers above 50 or price returns to mid-band.
    if (st.k > 50 || price > bb.mid) {
      return { side: 'sell', qty: pos };
    }
    // hard stop on continued breakdown
    if (price < bb.lower * 0.97) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Entry: deep stochastic oversold (%K<20) in an uptrend.
  // 20 is the conventional oversold line for the stochastic.
  if (price > sma200 && st.k < 20) {
    return { side: 'buy', qty: ctx.cash / price * 0.9 };
  }
  return null;
}
