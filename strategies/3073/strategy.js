/*
 * @coinsori-strategy v1
 * name: Multi-Asset Stochastic-Oversold MR Basket 4H
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, BNBUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The ledger proved defensive mean-reversion is the only robust edge on
 * crypto majors, and a 5-asset basket diversifies away single-asset melt-up lag. This is a
 * distinct construction from the Bollinger/Keltner champion: it enters on a stochastic
 * oscillator oversold print inside a rising 200-bar trend, sizes each leg by inverse-ATR
 * risk capped at a 20% share of equity, and exits on an RSI recovery or an ATR-trailing stop.
 * When it buys and sells: on each asset, buy when the %K stochastic crosses back up from
 * below 20 (oversold) while price is above a rising 200-bar average; sell half when RSI
 * crosses back above 50, and the rest on a 2.5x ATR trailing stop from the highest close
 * since entry.
 * When it does NOT work: in a broad coordinated crypto bear the rising-trend gate keeps it
 * flat (capital is safe but there is little upside), and a single asset's straight-line
 * melt-up still lags holding that asset. The trail can give back gains in a choppy recovery.
 */
function onUpdate(ctx) {
  const sym = ctx.sym;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const st = ctx.stoch(14, 3, 1);          // %K(14) smoothed by 3
  const stPrev = ctx.stoch(14, 3, 2);
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  const rsi = ctx.rsi(14, 1);
  const atr = ctx.atr(14, 1);
  if (st == null || stPrev == null || sma200 == null || sma200prev == null || rsi == null || atr == null || atr <= 0) return null;

  const uptrend = sma200 > sma200prev;
  const pos = ctx.pos(sym);

  if (pos > 0) {
    const peak = st.peak != null ? Math.max(st.peak, price) : price;
    st.peak = peak;
    const trailStop = peak - 2.5 * atr;    // 2.5 ATR below the peak: let winners run, cut reversals
    // Half the position is taken when RSI recovers above 50; the rest rides the trail.
    if (st.halfSold !== true && rsi > 50) {
      st.halfSold = true;
      return { side: 'sell', qty: pos * 0.5 };
    }
    if (price < trailStop) {
      st.peak = null;
      st.halfSold = null;
      st.cooldown = ctx.i;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (st.cooldown != null && ctx.i - st.cooldown < 4) return null; // 4-bar cooldown to avoid re-entry on the same flush
  if (!uptrend) return null;

  // Oversold %K crossing back up (stPrev < 20 and st >= 20) inside an uptrend = a dip being bought.
  const oversoldCross = stPrev.k < 20 && st.k >= 20;
  if (!oversoldCross) return null;

  // Risk 2.5% of equity per leg, inverse-ATR sized, capped at the 20% leg share.
  const riskBudget = 0.025 * ctx.cash;
  let qty = riskBudget / atr;
  const maxQty = (ctx.cash / price) * 0.20;
  qty = Math.min(qty, maxQty);
  if (qty <= 0) return null;
  st.peak = price;
  st.halfSold = null;
  st.cooldown = null;
  return { side: 'buy', qty: qty };
}
