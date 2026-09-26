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
 * When it buys and sells: in the BEAR leg it buys only at DEEP fear (index
 * under 20) and exits quickly on a tight 4x ATR stop or when fear recovers —
 * a panic-buy is a short trade, not a long hold. In the BULL leg it buys when
 * the 20-day EMA is above the 100-day EMA and sells on a wide 8x ATR trail or
 * when the trend flips down.
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

  if (pos > 0) {
    const hi = Math.max(st.peak || ctx.entryPx, price);
    st.peak = hi;
    if (st.leg === 'bear') {
      // Bear leg: panic-buys are quick — tight 4x ATR stop, exit on recovery.
      if ((fg != null && fg > 40) || price <= hi - 4 * atr) {
        st.peak = null; st.leg = null;
        return { side: 'sell', qty: pos };
      }
      return null;
    }
    // Bull leg: wide 8x ATR trail, exit when trend flips down.
    if (ema20 < ema100 || price <= hi - 8 * atr) {
      st.peak = null; st.leg = null;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // BEAR leg entry: DEEP fear (index under 20) while NOT in a confirmed uptrend.
  if (fg != null && fg < 20 && ema20 < ema100) {
    st.peak = price; st.leg = 'bear';
    return { side: 'buy', qty: ctx.cash / price * 0.5 };
  }

  // BULL leg entry: confirmed uptrend.
  if (ema20 > ema100) {
    st.peak = price; st.leg = 'bull';
    return { side: 'buy', qty: ctx.cash / price * 0.5 };
  }
  return null;
}
