/*
 * @coinsori-strategy v1
 * name: Keltner MR ATR-VolTarget LINK/LTC/DOGE/AVAX/BNB
 * ex: binance
 * syms: LINKUSDT, LTCUSDT, DOGEUSDT, AVAXUSDT, BNBUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The Keltner mean-reversion recipe was validated positive
 * ~29/32 windows across 11 assets on 4h. Its one weak spot is HIGH DRAWDOWN
 * on volatile assets (DOGE 30-33%, AVAX bear -15%). This version keeps the exact
 * proven entry/exit and adds ATR-based position sizing: risk a fixed dollar
 * fraction of equity per trade, so volatile coins automatically get smaller
 * positions. This attacks the MDD directly without touching the validated logic.
 * When it buys and sells: buys a flush to the lower Keltner band (EMA20 - 2.5x
 * ATR) with RSI<40 while price is above the 200-bar average; sells on the
 * snap-back to the middle band (EMA20). A 2-bar cooldown prevents re-buying.
 * When it does NOT work: in a persistent downtrend below the 200-bar average it
 * stays idle, and it lags straight-line melt-ups (no deep flushes to catch).
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
    st.cooldown = null;
    // ATR-scaled size: risk 1.5% of equity per trade, in coin units.
    // High-vol assets have large ATR -> smaller position -> lower drawdown.
    const riskEq = 0.015 * ctx.cash;
    const qty = riskEq / atr;
    const maxQty = ctx.cash / price * 0.9;
    return { side: 'buy', qty: Math.min(qty, maxQty) };
  }
  return null;
}
