/*
 * @coinsori-strategy v1
 * name: Macro-Gated Keltner MR BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated Keltner mean-reversion champion buys deep
 * flushes to the lower band, but flush-buying is dangerous when risk appetite
 * is low (a strong dollar or falling equities makes flushes keep going). This
 * overlays a macro regime filter so mean-reversion buys only fire in risk-on
 * conditions, aiming to cut drawdowns while keeping the defensive edge.
 * When it buys and sells: buys a flush to the lower Keltner band (EMA20 - 2.5x
 * ATR) with RSI<40, price above the 200-day average, AND a risk-on macro regime
 * (DXY not sharply rising / NDX not sharply falling). Sells on the snap-back
 * to the middle band (EMA20). If macro data is unavailable it degrades to the
 * plain champion (no macro gate).
 * When it does NOT work: in a persistent downtrend below the 200-day average it
 * stays idle; and if the macro filter is too strict it simply trades less.
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

  // Macro regime gate: only buy when risk-on. ctx.macro returns a scalar value
  // (or null when unavailable). Compare against the value from 3 bars ago using
  // a rolling ring buffer; degrade gracefully to the plain champion if null.
  let riskOn = true;
  const dxy = ctx.macro('dxy');
  const ndx = ctx.macro('ndx');
  if (Number.isFinite(dxy) && Number.isFinite(ndx)) {
    if (!st.mRing) st.mRing = [];
    st.mRing.push({ dxy, ndx });
    if (st.mRing.length > 3) st.mRing.shift();
    if (st.mRing.length === 3) {
      const old = st.mRing[0];
      const dxyChg = (dxy - old.dxy) / old.dxy * 100;
      const ndxChg = (ndx - old.ndx) / old.ndx * 100;
      if (dxyChg > 1.5) riskOn = false;   // strong dollar => avoid flush-buying
      if (ndxChg < -2.0) riskOn = false;  // equities crashing => flushes continue
    }
  }
  if (!riskOn) return null;

  if (price > sma200 && price <= lower && rsi < 40) {
    st.cooldown = null;
    const riskEq = 0.015 * ctx.cash;
    const qty = riskEq / atr;
    const maxQty = ctx.cash / price * 0.9;
    return { side: 'buy', qty: Math.min(qty, maxQty) };
  }
  return null;
}
