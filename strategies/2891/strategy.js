/*
 * @coinsori-strategy v1
 * name: FearGreed-Timed Keltner MR BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The ledger found pure fear-greed contrarian fails, but
 * sentiment can work as an ENTRY-TIMING tool. This adds a fear-greed filter to
 * the validated Keltner mean-reversion champion: only buy a flush when sentiment
 * is not euphoric (fear_greed < 75), so we avoid catching flushes during
 * blow-off-top greed where the snap-back is weaker. Uses the user's real
 * fear_greed data as a timing gate on top of the defensive champion.
 * When it buys and sells: buys a flush to the lower Keltner band (EMA20 - 2.5x
 * ATR) with RSI<40, price above the 200-day average, AND fear_greed < 75 (not
 * euphoric). Sells on the snap-back to the middle band (EMA20). If the fear_greed
 * feed is unavailable it degrades to the plain champion.
 * When it does NOT work: in a persistent downtrend below the 200-day average it
 * stays idle; and if the filter rarely triggers it simply trades less.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const sma200 = ctx.sma(200, 1);
  const rsi = ctx.rsi(14, 1);
  if (ema20 == null || atr == null || sma200 == null || rsi == null || atr <= 0) return null;

  const lower = ema20 - 2.5 * atr;
  const st = ctx.state;

  if (pos > 0) {
    if (price > ema20) {
      st.cooldown = ctx.i + 2;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (st.cooldown != null && ctx.i < st.cooldown) return null;

  // Fear-greed timing gate: avoid buying flushes during euphoric greed.
  // Degrade gracefully to the plain champion if the feed is unavailable.
  const fg = ctx.data('fear_greed');
  if (fg != null && fg >= 75) return null;

  if (price > sma200 && price <= lower && rsi < 40) {
    st.cooldown = null;
    const riskEq = 0.015 * ctx.cash;
    const qty = riskEq / atr;
    const maxQty = ctx.cash / price * 0.9;
    return { side: 'buy', qty: Math.min(qty, maxQty) };
  }
  return null;
}
