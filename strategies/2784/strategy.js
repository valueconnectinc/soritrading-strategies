/*
 * @coinsori-strategy v1
 * name: EMA Trend Pullback BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: In a confirmed bull (50-day above 200-day average) price
 * tends to rise in steps: it pulls back to a fast average then continues up.
 * Buying those pullbacks instead of waiting for a fresh slow crossover captures
 * far more of the bull move, while the 50/200 filter keeps us out of bears.
 * When it buys and sells: buys when the 50-day EMA is above the 200-day EMA
 * (bull regime) AND price pulls back to touch the 20-day EMA. Sells when price
 * falls 3x ATR below the highest point since entry (a trail that lets winners
 * run but cuts deep losses) or when the 50-day EMA crosses back below the
 * 200-day EMA (regime flip down).
 * When it does NOT work: in a choppy sideways market the pullback-to-20-EMA
 * fires repeatedly and whipsaws; in a sharp V crash the 3x ATR trail gives back
 * a chunk before triggering.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const ema20 = ctx.ema(20, 1);
  const ema50 = ctx.ema(50, 1);
  const ema200 = ctx.ema(200, 1);
  if (ema20 == null || ema50 == null || ema200 == null) return null;

  const atr = ctx.atr(14, 1);
  if (atr == null) return null;

  const bull = ema50 > ema200; // long-term regime: only trade in a bull
  const st = ctx.state;

  if (pos > 0) {
    // Tight trail: 3x ATR below the highest price since entry.
    const hi = Math.max(st.peak || ctx.entryPx, price);
    st.peak = hi;
    const trail = hi - 3 * atr;
    if (!bull || price <= trail) {
      st.peak = null;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Enter on a pullback to the 20-EMA inside a confirmed bull.
  if (bull && price <= ema20) {
    st.peak = price;
    return { side: 'buy', qty: ctx.cash / price * 0.5 };
  }
  return null;
}
