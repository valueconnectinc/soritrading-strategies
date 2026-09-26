/*
 * @coinsori-strategy v1
 * name: Regime-Switch Hybrid SOL 4H (fixed-size verify)
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Crypto alternates between panic crashes (where buying
 * fear pays) and steady uptrends (where riding the trend pays). A single rule
 * can't do both, so this switches between two validated modes.
 * When it buys and sells: in the BEAR leg it buys only at deep fear and exits
 * on a quick recovery or a 4x ATR stop. In the BULL leg it buys a pullback to
 * the 20-EMA only when the 20-EMA is above the 50-EMA (confirmed uptrend) and
 * exits on a 50-EMA break or a 3x ATR stop.
 * When it does NOT work: in a calm grind-down the fear leg never triggers and
 * we sit in cash; and in a sharp V-crash even the wide stop takes a hit.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const fg = ctx.data('fear_greed');
  const ema20 = ctx.ema(20, 1), ema50 = ctx.ema(50, 1);
  const atr = ctx.atr(14, 1);
  if (ema20 == null || ema50 == null || atr == null) return null;

  const st = ctx.state;

  if (pos > 0) {
    const hi = Math.max(st.peak || ctx.entryPx, price);
    st.peak = hi;
    if (st.leg === 'bear') {
      if ((fg != null && fg > 40) || price <= hi - 4 * atr) {
        st.peak = null; st.leg = null;
        return { side: 'sell', qty: pos };
      }
      return null;
    }
    if (ema20 < ema50 || price <= hi - 3 * atr) {
      st.peak = null; st.leg = null;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (fg != null && fg < 20 && ema20 < ema50) {
    st.peak = price; st.leg = 'bear';
    return { side: 'buy', qty: ctx.cash / price * 0.5 };
  }

  if (ema20 > ema50 && price <= ema20 + 0.5 * atr) {
    st.peak = price; st.leg = 'bull';
    return { side: 'buy', qty: ctx.cash / price * 0.5 };
  }
  return null;
}
