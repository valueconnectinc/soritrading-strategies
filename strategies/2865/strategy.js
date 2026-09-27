/*
 * @coinsori-strategy v1
 * name: BTC 4H Keltner Mean-Reversion (generalization)
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The Keltner mean-reversion recipe was validated positive
 * 4/4 on ETH 4h. This is a generalization test on BTC 4h to confirm it is a
 * cross-asset family, not an ETH-specific fit. Same ATR-adaptive band logic.
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
  if (ema20 == null || atr == null || sma200 == null || rsi == null) return null;

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
    return { side: 'buy', qty: ctx.cash / price * 0.9 };
  }
  return null;
}
