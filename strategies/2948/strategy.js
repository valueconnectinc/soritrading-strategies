/*
 * @coinsori-strategy v1
 * name: BTC 1D Dual-Family MR + OBV Trend
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Combines two families that the ledger shows are each robust
 * on BTC 1D but capture different regimes. Mean-reversion buys sharp oversold
 * dips in chop/bear (defensive, low drawdown). OBV volume-flow trend catches
 * accumulation-driven melt-ups that mean-reversion sits out. Switching between
 * them on a rising 200-day average lets us profit in both regimes.
 * When it buys and sells: Buys either (1) mean-reversion: close below the lower
 * Bollinger band with RSI<30 above a rising 200-day average, or (2) trend: OBV
 * rising vs 30 days ago with volume confirmation above a rising 200-day average.
 * Sells on a mid-band/RSI>60 rebound in chop, or when OBV turns down in a strong
 * trend.
 * When it does NOT work: In a straight-line crash it stays in cash (good) but
 * the OBV trend leg can be late entering after a sharp V-reversal, and the
 * mean-reversion leg needs either a bounce or a sustained uptrend. It is not a
 * crash-profiting short strategy.
 */
function onUpdate(ctx) {
  const px = ctx.price;
  if (px == null || px <= 0) return null;

  const s200 = ctx.sma(200, 1);
  const s200prev = ctx.sma(200, 2);
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const lo10 = ctx.low(10, 1);
  if (s200 == null || s200prev == null || bb == null || rsi == null || lo10 == null) return null;

  const rising = s200 > s200prev;
  // Strong trend: price well above a rising 200-day average (melt-up regime).
  const strongTrend = rising && px > s200 * 1.2;

  // Build OBV from close direction and volume.
  const closes = ctx.closes;
  const vols = ctx.volumes;
  let obvRising = false;
  let obvFalling = false;
  if (closes && vols && closes.length >= 32) {
    let obv = 0;
    const obvSeries = [];
    for (let k = 1; k < closes.length; k++) {
      const c = closes[k], p = closes[k - 1], v = vols[k];
      if (!Number.isFinite(c) || !Number.isFinite(p) || !Number.isFinite(v)) continue;
      if (c > p) obv += v;
      else if (c < p) obv -= v;
      obvSeries.push(obv);
    }
    if (obvSeries.length >= 32) {
      const obvNow = obvSeries[obvSeries.length - 1];
      const obvPast = obvSeries[obvSeries.length - 31];
      obvRising = obvNow > obvPast * 1.01;
      obvFalling = obvNow < obvPast * 0.99;
    }
  }
  const avgV = ctx.avgVol(30);
  const volOk = avgV != null && Number.isFinite(avgV) && avgV > 0 && ctx.vol > avgV;

  if (ctx.position <= 0) {
    // Mean-reversion entry: oversold dip above a rising 200-day average.
    if (rising && px > s200 && px < bb.lower && rsi < 30) {
      ctx.state.entryPx = px;
      return { side: 'buy', qty: (ctx.cash / px) * 0.99 };
    }
    // OBV trend entry: money flowing in with volume, above rising 200-day avg.
    if (rising && px > s200 && obvRising && volOk) {
      ctx.state.entryPx = px;
      return { side: 'buy', qty: (ctx.cash / px) * 0.99 };
    }
    return null;
  }

  if (strongTrend) {
    // In a melt-up, exit when OBV turns down, else ride with a trailing stop.
    if (obvFalling || px < lo10) {
      return { side: 'sell', qty: ctx.position };
    }
    return null;
  }

  // Normal mean-reversion exit in chop: rebound to mid-band or RSI>60.
  if (px > bb.mid || rsi > 60) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
