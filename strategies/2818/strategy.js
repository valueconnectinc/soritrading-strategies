/*
 * @coinsori-strategy v1
 * name: OBV Trend Re-Arming Scale-Out 1D
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The OBV volume-flow trend family is validated across
 * BTC/ETH/SOL — it captures bull momentum the mean-reversion champion misses.
 * Its #1 weakness is high drawdown because it stays fully invested through
 * pullbacks. Full-exit stops destroy return via whipsaw, and a deep one-way
 * scale-out fires too late. This version cuts to 60% on a MODERATE 20% drop
 * from the peak, then RE-BUYS back to full when price makes a new high — a
 * sell-into-weakness / buy-back-on-recovery control that trims the crash
 * without abandoning the trend.
 * When it buys and sells: buys when 30-day OBV is rising AND price is above the
 * 200-day average AND volume confirms. While holding, if price falls >20% below
 * its peak since entry it sells down to 60% size; it buys back to full when
 * price recovers to a new high. Exits fully when OBV turns down.
 * When it does NOT work: in a slow grinding bear where price keeps making
 * lower highs the re-buy never triggers and it sits at reduced size; and it
 * still lags the sharpest V-shaped melt-ups (200-SMA gate + 30d OBV lag).
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma200 = ctx.sma(200, 1);
  const atr = ctx.atr(14, 1);
  if (sma200 == null || atr == null) return null;

  const closes = ctx.closes;
  const vols = ctx.volumes;
  if (!closes || !vols || closes.length < 32) return null;

  let obv = 0;
  const obvSeries = [];
  for (let k = 1; k < closes.length; k++) {
    const c = closes[k], p = closes[k - 1], v = vols[k];
    if (!Number.isFinite(c) || !Number.isFinite(p) || !Number.isFinite(v)) continue;
    if (c > p) obv += v;
    else if (c < p) obv -= v;
    obvSeries.push(obv);
  }
  if (obvSeries.length < 32) return null;
  const obvNow = obvSeries[obvSeries.length - 1];
  const obvPast = obvSeries[obvSeries.length - 31];
  const rising = obvNow > obvPast * 1.01;
  const falling = obvNow < obvPast * 0.99;

  const avgV = ctx.avgVol(30);
  const volOk = avgV != null && Number.isFinite(avgV) && avgV > 0 && ctx.vol > avgV;

  const st = ctx.state;
  let cd = st.cd || 0;
  if (cd > 0) cd--;
  ctx.state.cd = cd;

  // GENTLE volatility-target sizing: full size up to 6% ATR; scale linearly to
  // 50% size at 12% ATR. Only extreme stress cuts entry size.
  const atrPct = atr / price;
  let sizeFrac = 1.0;
  if (atrPct > 0.06) {
    sizeFrac = Math.max(0.5, 1.0 - (atrPct - 0.06) / 0.06);
  }

  if (pos > 0) {
    const peak = st.peak || price;
    const reduced = st.reduced || 0;
    const ddFromPeak = (peak - price) / peak;

    // MODERATE 20% drawdown triggers the cut — early enough to matter but not
    // so tight it fires on normal pullbacks the trend should ride.
    if (!reduced && ddFromPeak > 0.20) {
      ctx.state.reduced = 1;
      return { side: 'sell', qty: pos * 0.4 }; // cut to 60% size
    }

    // RE-ARM: on a new high, restore full size (buy back the 40% we sold).
    if (reduced && price > peak) {
      ctx.state.reduced = 0;
      ctx.state.peak = price;
      const fullQty = ctx.cash / price * 0.95 * sizeFrac;
      if (pos < fullQty) {
        return { side: 'buy', qty: Math.min(fullQty - pos, ctx.cash / price) };
      }
    }

    if (price > peak) ctx.state.peak = price;

    if (falling && cd === 0) {
      ctx.state.cd = 5;
      ctx.state.reduced = 0;
      ctx.state.peak = 0;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (rising && price > sma200 && volOk && cd === 0) {
    ctx.state.cd = 5;
    ctx.state.reduced = 0;
    ctx.state.peak = price;
    const qty = ctx.cash / price * 0.95 * sizeFrac;
    return { side: 'buy', qty: qty };
  }
  return null;
}
