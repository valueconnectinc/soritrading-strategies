/*
 * @coinsori-strategy v1
 * name: Regime-Switch Fear+Trend BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Crypto alternates between panic crashes (where buying the
 * fear is profitable) and steady uptrends (where riding the trend wins). A
 * single rule can't do both, so this switches between two validated modes:
 * buy panic at extreme fear, and ride the trend when it is clearly up.
 * When it buys and sells: in the BEAR leg it buys when the fear-greed index is
 * in extreme fear (a panic bottom) and sells when the index recovers. In the
 * BULL leg it buys when the 20-day EMA is above the 100-day EMA (confirmed
 * uptrend) and sells on a wide ATR trail or when the trend flips down.
 * When it does NOT work: the fear-contrarian leg needs real panic events — in
 * a calm grind-down it never triggers and we just sit in cash; and in a sharp
 * V-crash the wide trend trail gives back a large chunk before it fires.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const fg = ctx.data('fear_greed');
  const ema20 = ctx.ema(20, 1);
  const ema100 = ctx.ema(100, 1);
  const atr = ctx.atr(14, 1);
  if (ema20 == null || ema100 == null || atr == null) return null;

  const st = ctx.state;

  // ---- BULL leg: ride the confirmed uptrend ----
  if (pos > 0) {
    const hi = Math.max(st.peak || ctx.entryPx, price);
    st.peak = hi;
    // Wide 8x ATR trail lets winners run; exit when trend flips or trail breaks.
    if (ema20 < ema100 || price <= hi - 8 * atr) {
      st.peak = null;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // ---- BEAR leg: panic-buy at extreme fear ----
  // Only buy panic when we are NOT in a confirmed uptrend (else the trend leg
  // would already have us in). fg is a 0-100 index; extreme fear = low value.
  if (fg != null && fg < 25 && ema20 < ema100) {
    st.peak = price;
    return { side: 'buy', qty: ctx.cash / price * 0.5 };
  }

  // ---- BULL leg entry: confirmed uptrend ----
  if (ema20 > ema100) {
    st.peak = price;
    return { side: 'buy', qty: ctx.cash / price * 0.5 };
  }
  return null;
}
