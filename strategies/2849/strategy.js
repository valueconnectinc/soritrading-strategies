/*
 * @coinsori-strategy v1
 * name: Fed Tightening-Onset Regime BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin is a high-beta risk asset that historically
 * struggles during Fed tightening cycles (rising policy rates drain
 * liquidity) and thrives when the Fed is on hold or easing. This bets on
 * the monetary-policy regime, plus a long-term price trend guard so it does
 * not ride non-hiking bear markets (e.g. 2018) to the bottom. Stay long
 * only when the Fed is not hiking AND price is above its 200-day average.
 * When it buys and sells: stays long while the fed funds rate is not above
 * its level 30 days ago (no tightening) and price is above the 200-day
 * average; sells when either condition breaks.
 * When it does NOT work: crypto can rally hard even while the Fed hikes,
 * and the 200-day guard can keep it out of the early stage of a new bull
 * after a long bear. It is a slow, macro-frequency signal with a real
 * drawdown when it is long during a non-hiking bear.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  // Fed funds rate now, and its level 30 days ago (both external datasets).
  const now = Number(ctx.data('fed'));
  const lag = Number(ctx.data('fed_lag30'));
  if (!Number.isFinite(now) || now <= 0) return null;
  if (!Number.isFinite(lag) || lag <= 0) return null;

  // Long-term price trend guard (200-day SMA).
  const sma200 = ctx.sma(200);
  if (sma200 == null) return null;
  const priceAboveTrend = price > sma200;

  // Hiking if the current rate is above the 30-day-ago level by a small
  // buffer (0.25pp = one typical hike) to avoid churn on tiny moves.
  const hiking = now > lag + 0.25;

  const longOK = !hiking && priceAboveTrend;

  // --- Exit: tightening began, or price fell below its 200-day trend ---
  if (pos > 0) {
    if (!longOK) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // --- Entry: not hiking and above the long-term trend ---
  if (longOK) {
    return { side: 'buy', qty: ctx.cash / price * 0.95 };
  }
  return null;
}
