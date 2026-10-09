/*
 * @coinsori-strategy v1
 * name: BTC 1D Keltner MR + Gold Risk-Off Gate
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Deep flushes to the lower Keltner band inside an uptrend
 * are usually bought back quickly (mean reversion). Adding a gold risk-off gate
 * skips long entries when gold is spiking well above its own trend — a signal
 * that global risk appetite is collapsing and crypto is about to follow.
 * When it buys and sells: buys a 2.5xATR flush below the 20-day average with RSI
 * below 40, only above the 200-day average and with above-average volume; sells
 * on snap-back to the middle band. A squeeze-breakout leg buys above the upper
 * band and sells below the middle. All long entries are skipped while gold is
 * strongly elevated (risk-off).
 * When it does NOT work: in a persistent downtrend it stays in cash, and it
 * lags straight-line melt-ups (few deep flushes to catch). It underperforms
 * buy-and-hold in strong bull years because it is often flat, and it pays fees
 * on every round trip. When gold data is missing the gate is skipped, so it
 * behaves exactly like the champion.
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
  const upper = ema20 + 2.5 * atr;
  const st = ctx.state;

  if (pos > 0) {
    const brk = st.entryType === 'brk';
    if (brk && price < ema20) {
      st.cooldown = ctx.i + 2;
      return { side: 'sell', qty: pos };
    }
    if (!brk && price > ema20) {
      st.cooldown = ctx.i + 2;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (st.cooldown != null && ctx.i < st.cooldown) return null;

  // Squeeze detection: current ATR well below its own 50-bar mean.
  if (st.atrs == null) st.atrs = [];
  st.atrs.push(atr);
  if (st.atrs.length > 50) st.atrs.shift();
  let atrAvg = null;
  if (st.atrs.length >= 30) {
    let s = 0;
    for (let k = 0; k < st.atrs.length; k++) s += st.atrs[k];
    atrAvg = s / st.atrs.length;
  }
  const squeeze = atrAvg != null && atr < 0.85 * atrAvg;

  const volOk = ctx.volPrev != null && ctx.volPrev > ctx.avgVol(20);

  if (price <= sma200) return null;

  // Gold risk-off gate: skip long entries while gold is >3% above its own 60-bar mean.
  const gold = ctx.macro('gold');
  if (gold != null && Number.isFinite(gold)) {
    if (st.golds == null) st.golds = [];
    st.golds.push(gold);
    if (st.golds.length > 60) st.golds.shift();
    if (st.golds.length >= 30) {
      let gs = 0;
      for (let k = 0; k < st.golds.length; k++) gs += st.golds[k];
      const goldMean = gs / st.golds.length;
      if (goldMean > 0 && gold > goldMean * 1.03) return null; // 3% above mean = spiking = risk-off
    }
  }

  // Mean-reversion entry: deep flush to the lower band with weak momentum.
  if (price <= lower && rsi < 40 && volOk) {
    st.entryType = 'mr';
    const qty = Math.min(0.015 * ctx.cash / atr, ctx.cash / price * 0.9);
    return { side: 'buy', qty };
  }

  // Momentum entry: squeeze breakout above the upper band.
  if (price > upper && squeeze && volOk) {
    st.entryType = 'brk';
    const qty = Math.min(0.015 * ctx.cash / atr, ctx.cash / price * 0.9);
    return { side: 'buy', qty };
  }

  return null;
}
