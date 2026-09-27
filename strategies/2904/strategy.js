/*
 * @coinsori-strategy v1
 * name: Dual-Mode OBV+Keltner Hybrid v3 (trend-lag fix)
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: v3 of the validated dual-mode hybrid. The v2 champion protected
 * capital (low MDD) but structurally LAGGED buy-and-hold in strong melt-ups — it
 * exited on every OBV turn (too jumpy) and required a volume surge to enter (blocked
 * real bull entries). v3 fixes exactly that: in trend mode it now holds through the
 * whole melt-up, exiting only when price closes below the 50-day average (a slow,
 * reliable exit), and it enters any confirmed uptrend without needing a volume surge.
 * In downtrend/chop it still runs the validated Keltner mean-reversion flush-buying.
 * When it buys and sells: UPTREND mode buys when price is above the 200-day average
 * and 45-day OBV money-flow is rising; sells only when price closes below the 50-day
 * average. DOWNTREND mode buys a deep flush to EMA20 - 2.5x ATR with RSI<40, sells on
 * snap-back to EMA20.
 * When it does NOT work: in a long flat chop near the 200-day average the regime flips
 * and can whipsaw; it never catches a melt-up while in defensive mode; and in a
 * relentless straight-line bull it still gives back some gains on the 50-day exit.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma50 = ctx.sma(50, 1);
  const rsi = ctx.rsi(14, 1);
  if (ema20 == null || atr == null || sma200 == null || sma50 == null || rsi == null || atr <= 0) return null;

  const st = ctx.state;
  const closes = ctx.closes;
  const vols = ctx.volumes;
  const LOOKBACK = 45;
  if (!closes || !vols || closes.length < LOOKBACK + 2) return null;

  // OBV money-flow trend.
  let obv = 0;
  const obvSeries = [];
  for (let k = 1; k < closes.length; k++) {
    const c = closes[k], p = closes[k - 1], v = vols[k];
    if (!Number.isFinite(c) || !Number.isFinite(p) || !Number.isFinite(v)) continue;
    if (c > p) obv += v;
    else if (c < p) obv -= v;
    obvSeries.push(obv);
  }
  if (obvSeries.length < LOOKBACK + 1) return null;
  const obvNow = obvSeries[obvSeries.length - 1];
  const obvPast = obvSeries[obvSeries.length - 1 - LOOKBACK];
  const obvRising = obvNow > obvPast * 1.01;

  // Regime: uptrend = price above 200-day average AND OBV money-flow rising.
  const uptrend = price > sma200 && obvRising;

  let cd = st.cd || 0;
  if (cd > 0) cd--;
  ctx.state.cd = cd;

  const atrPct = atr / price;
  let sizeFrac = 1.0;
  if (atrPct > 0.06) sizeFrac = Math.max(0.5, 1.0 - (atrPct - 0.06) / 0.06);

  // ---- UPTREND mode: OBV momentum trend capture (v3: hold melt-ups longer) ----
  if (uptrend) {
    st.mode = 'trend';
    if (pos > 0) {
      // Exit only on a slow 50-day EMA cross — lets the position ride the whole melt-up.
      if (price < sma50 && cd === 0) {
        ctx.state.cd = 5;
        return { side: 'sell', qty: pos };
      }
      return null;
    }
    // Enter any confirmed uptrend. Volume surge no longer required (it blocked bull entries).
    if (cd === 0) {
      ctx.state.cd = 5;
      const qty = ctx.cash / price * 0.95 * sizeFrac;
      return { side: 'buy', qty: qty };
    }
    return null;
  }

  // ---- DOWNTREND/CHOP mode: Keltner mean-reversion flush-buying ----
  st.mode = 'mr';
  const lower = ema20 - 2.5 * atr;
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
    const riskEq = 0.015 * ctx.cash;
    const qty = riskEq / atr;
    const maxQty = ctx.cash / price * 0.9;
    return { side: 'buy', qty: Math.min(qty, maxQty) };
  }
  return null;
}
