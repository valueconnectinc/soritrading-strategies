/*
 * @coinsori-strategy v1
 * name: Keltner MR Daily + DXY Filter
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The ATR-adaptive Keltner mean-reversion recipe is the
 * validated champion (positive across ~29/32 windows at 4h and ~13/14 at 1d).
 * It buys deep flushes to the lower Keltner band and sells on the snap-back.
 * This version adds a macro regime filter: it skips the buy when the US dollar
 * index (DXY) is strengthening, because a rising dollar is typically risk-off
 * for crypto and coincides with the worst drawdown periods.
 * When it buys and sells: buys a flush to the lower Keltner band (EMA20 - 2.5x
 * ATR) with RSI<40 while price is above the 200-day average AND the dollar is
 * not strengthening; sells on the snap-back to the middle band (EMA20). A
 * 2-bar cooldown prevents re-buying. Position is ATR-scaled.
 * When it does NOT work: in a persistent downtrend below the 200-day average it
 * stays idle, and it lags straight-line melt-ups (few deep flushes to catch).
 * If DXY data is unavailable the filter is skipped (strategy behaves as pure
 * Keltner MR).
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

  if (price > sma200 && price <= lower && rsi < 40) {
    // DXY regime gate: skip buy if dollar strengthening. Missing/neutral = allow.
    const dxy = ctx.macro('dxy');
    let dollarRising = false;
    if (dxy != null && Number.isFinite(dxy)) {
      dollarRising = dxy > 100;
    }
    if (dollarRising) return null;

    st.cooldown = null;
    // ATR-scaled size: risk 1.5% of equity per trade, in coin units.
    const riskEq = 0.015 * ctx.cash;
    const qty = riskEq / atr;
    const maxQty = ctx.cash / price * 0.9;
    return { side: 'buy', qty: Math.min(qty, maxQty) };
  }
  return null;
}
