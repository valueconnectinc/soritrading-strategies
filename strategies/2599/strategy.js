/*
 * @coinsori-strategy v1
 * name: OI Sentiment Trend BTC 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Open interest is a sentiment gauge. In a healthy uptrend
 * new longs keep entering (OI rising with price). When price rises but OI
 * falls, the move is weak and likely to reverse. This family (funding/OI
 * sentiment) is diverse from the trend and mean-reversion champions — it bets
 * on positioning, not just price. Rising OI confirms breakouts; an OI collapse
 * flags capitulation.
 * When it buys and sells: buys when price is above its 50-SMA, RSI>55, and OI
 * is rising (confirms the breakout has real conviction); exits when price
 * closes below the 50-SMA or OI drops sharply (position unwind).
 * When it does NOT work: if OI data is sparse/absent it falls back to plain
 * trend (weaker edge); in a slow grind-up where OI is flat it may miss entries;
 * OI is a lagging confirmation so fast reversals still hurt.
 */
function onUpdate(ctx) {
  const sma50 = ctx.sma(50, 1);
  const rsi = ctx.rsi(14, 1);
  if (sma50 == null || rsi == null) return null;

  const oi = ctx.binanceOi ? ctx.binanceOi() : null;
  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    // Exit on a trend break OR a sharp OI unwind (position capitulation).
    if (price < sma50) return { side: 'sell', qty: pos };
    if (oi != null && oi.changePct != null && oi.changePct < -8) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Need an uptrend and momentum to enter.
  if (price <= sma50 || rsi <= 55) return null;

  // OI as conviction gate: prefer entries where OI confirms new positioning.
  if (oi != null) {
    if (oi.changePct != null && oi.changePct <= 0) return null; // no fresh longs, skip
    if (oi.total == null) return null; // OI present but unusable -> stay out
  }

  return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
}
