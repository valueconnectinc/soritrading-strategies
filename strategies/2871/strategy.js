/*
 * @coinsori-strategy v1
 * name: Keltner MR Daily + FearGreed Confirm
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated Keltner mean-reversion recipe buys deep
 * flushes to the lower band. This version adds a sentiment CONFIRMATION gate
 * (fear & greed index) on top of the price signal — the ledger showed
 * sentiment fails standalone but may work as a confirmation filter. The idea:
 * only buy a price flush when sentiment is actually fearful (index < 60), so
 * we skip flushes that happen while the crowd is still greedy (those flushes
 * are more likely to keep falling).
 * When it buys and sells: identical to the champion — buys a flush to the
 * lower Keltner band (EMA20 - 2.5x ATR) with RSI<40 above the 200-day average,
 * now also requiring the fear-greed index below 60. Sells on the snap-back to
 * the middle band. ATR-scaled position size.
 * When it does NOT work: in a persistent downtrend below the 200-day average
 * it stays idle, and it lags straight-line melt-ups (few deep flushes to
 * catch). The sentiment gate also cuts already-few trades, so it may simply
 * underperform the plain champion in markets where every flush reverts.
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

  // Sentiment confirmation: only buy a flush when the crowd is not greedy.
  // Threshold 60 = the index's neutral line; a flush with fg>=60 (greed) is
  // more likely a dip in a hype-driven move that keeps falling. If data is
  // missing, fall back to the plain price signal (do not block trades).
  const fg = Number(ctx.data('fear_greed'));
  if (Number.isFinite(fg) && fg > 0 && fg >= 60) return null;

  if (price > sma200 && price <= lower && rsi < 40) {
    st.cooldown = null;
    // ATR-scaled size: risk 1.5% of equity per trade, in coin units.
    const riskEq = 0.015 * ctx.cash;
    const qty = riskEq / atr;
    const maxQty = ctx.cash / price * 0.9;
    return { side: 'buy', qty: Math.min(qty, maxQty) };
  }
  return null;
}
