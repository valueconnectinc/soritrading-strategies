/*
 * @coinsori-strategy v1
 * name: BTC 1D Hybrid MR + Squeeze + Bull Sleeve (EMA20 exit)
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Deep flushes to the lower Keltner band inside an uptrend
 * are usually bought back quickly (mean reversion), and low-volatility squeezes
 * that break out tend to keep trending (momentum). In a strong bull regime a
 * fresh 90-day high is bought and held while price stays above the 20-day EMA,
 * so straight melt-ups are captured instead of being stopped out by noise.
 * When it buys and sells: buys a flush to the lower band with RSI below 40, or
 * a squeeze breakout above the upper band, both only above the 200-day average
 * and with above-average volume; in a strong bull regime it also buys a fresh
 * 90-day high. A flush trade sells on the snap-back to the middle band, a
 * breakout and a bull-sleeve trade sell below the middle band (EMA20).
 * When it does NOT work: in a persistent downtrend it stays in cash, and in a
 * choppy sideways market above the 200-day average the bull sleeve can whipsaw.
 * It underperforms buy-and-hold in strong bull years that never pull back to
 * the lower band, and it pays fees on every round trip. Defensive first.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  // Closed bars only -> identical in backtest, paper and live.
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const sma200 = ctx.sma(200, 1);
  const rsi = ctx.rsi(14, 1);
  if (ema20 == null || atr == null || sma200 == null || rsi == null || atr <= 0) return null;

  const lower = ema20 - 2.5 * atr; // 2.5xATR: deep enough to be a real flush, rare enough to avoid overtrading
  const upper = ema20 + 2.5 * atr;
  const st = ctx.state;

  if (pos > 0) {
    const et = st.entryType;
    if (et === 'mr' && price > ema20) { // flush trade: exit on snap-back to the middle band
      st.cooldown = ctx.i + 2;
      return { side: 'sell', qty: pos };
    }
    if (et === 'brk' && price < ema20) { // breakout trade: hold while above the middle band
      st.cooldown = ctx.i + 2;
      return { side: 'sell', qty: pos };
    }
    if (et === 'trend' && price < ema20) { // bull sleeve: ride the melt-up until the 20-day trend flips
      st.cooldown = ctx.i + 2;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (st.cooldown != null && ctx.i < st.cooldown) return null;

  // Squeeze detection: current ATR well below its own 50-bar mean (low volatility).
  if (st.atrs == null) st.atrs = [];
  st.atrs.push(atr);
  if (st.atrs.length > 50) st.atrs.shift();
  let atrAvg = null;
  if (st.atrs.length >= 30) {
    let s = 0;
    for (let k = 0; k < st.atrs.length; k++) s += st.atrs[k];
    atrAvg = s / st.atrs.length;
  }
  const squeeze = atrAvg != null && atr < 0.85 * atrAvg; // 0.85: vol notably below its own average

  // Volume confirmation on the previous (closed) bar.
  const volOk = ctx.volPrev != null && ctx.volPrev > ctx.avgVol(20);

  if (price <= sma200) return null; // trend gate: only trade above the 200-day average

  // Mean-reversion entry: deep flush to the lower band with weak momentum.
  if (price <= lower && rsi < 40 && volOk) {
    st.entryType = 'mr';
    const qty = Math.min(0.015 * ctx.cash / atr, ctx.cash / price * 0.9); // risk 1.5% of equity per trade
    return { side: 'buy', qty };
  }

  // Momentum entry: squeeze breakout above the upper band.
  if (price > upper && squeeze && volOk) {
    st.entryType = 'brk';
    const qty = Math.min(0.015 * ctx.cash / atr, ctx.cash / price * 0.9);
    return { side: 'buy', qty };
  }

  // Bull sleeve: strong regime only, buy a fresh 90-day high, ride until EMA20 flips.
  const sma50 = ctx.sma(50, 1);
  const high90 = ctx.high(90, 1);
  if (sma50 != null && high90 != null && price > sma200 * 1.15 && sma50 > sma200 && price > high90 && volOk) {
    st.entryType = 'trend';
    const qty = Math.min(0.012 * ctx.cash / atr, ctx.cash / price * 0.9); // slightly smaller: trend trades whipsaw more
    return { side: 'buy', qty };
  }

  return null;
}
```

Wait — I changed `ctx.sma(50, 1)`... it was `ctx.sma(50, 1)` in the original? Let me check: original code had `const sma50 = ctx.sma(50, 1);` yes. And `ctx.high(90, 1)`. OK.

I removed the `st.peak = price` line and the trailing stop. Everything else identical.

Let me save and run on the 3 windows.</think>Baseline on my windows confirms the problem: the champion lost money in the recent bull window (-4.0% vs bench +90.8%). Now saving the variant with EMA20 exit for the bull sleeve.

<｜DSML｜tool_calls>
<｜DSML｜invoke name="save_strategy">
<｜DSML｜parameter name="code" string="true">/*
 * @coinsori-strategy v1
 * name: BTC 1D Hybrid MR + Squeeze + Bull Sleeve (EMA20 exit)
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Deep flushes to the lower Keltner band inside an uptrend
 * are usually bought back quickly (mean reversion), and low-volatility squeezes
 * that break out tend to keep trending (momentum). In a strong bull regime a
 * fresh 90-day high is bought and held while price stays above the 20-day EMA,
 * so straight melt-ups are captured instead of being stopped out by noise.
 * When it buys and sells: buys a flush to the lower band with RSI below 40, or
 * a squeeze breakout above the upper band, both only above the 200-day average
 * and with above-average volume; in a strong bull regime it also buys a fresh
 * 90-day high. A flush trade sells on the snap-back to the middle band, a
 * breakout and a bull-sleeve trade sell below the middle band (20-day EMA).
 * When it does NOT work: in a persistent downtrend it stays in cash, and in a
 * choppy sideways market above the 200-day average the bull sleeve can whipsaw.
 * It underperforms buy-and-hold in strong bull years that never pull back to
 * the lower band, and it pays fees on every round trip. Defensive first.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  // Closed bars only -> identical in backtest, paper and live.
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const sma200 = ctx.sma(200, 1);
  const rsi = ctx.rsi(14, 1);
  if (ema20 == null || atr == null || sma200 == null || rsi == null || atr <= 0) return null;

  const lower = ema20 - 2.5 * atr; // 2.5xATR: deep enough to be a real flush, rare enough to avoid overtrading
  const upper = ema20 + 2.5 * atr;
  const st = ctx.state;

  if (pos > 0) {
    const et = st.entryType;
    if (et === 'mr' && price > ema20) { // flush trade: exit on snap-back to the middle band
      st.cooldown = ctx.i + 2;
      return { side: 'sell', qty: pos };
    }
    if (et === 'brk' && price < ema20) { // breakout trade: hold while above the middle band
      st.cooldown = ctx.i + 2;
      return { side: 'sell', qty: pos };
    }
    if (et === 'trend' && price < ema20) { // bull sleeve: ride the melt-up until the 20-day trend flips
      st.cooldown = ctx.i + 2;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (st.cooldown != null && ctx.i < st.cooldown) return null;

  // Squeeze detection: current ATR well below its own 50-bar mean (low volatility).
  if (st.atrs == null) st.atrs = [];
  st.atrs.push(atr);
  if (st.atrs.length > 50) st.atrs.shift();
  let atrAvg = null;
  if (st.atrs.length >= 30) {
    let s = 0;
    for (let k = 0; k < st.atrs.length; k++) s += st.atrs[k];
    atrAvg = s / st.atrs.length;
  }
  const squeeze = atrAvg != null && atr < 0.85 * atrAvg; // 0.85: vol notably below its own average

  // Volume confirmation on the previous (closed) bar.
  const volOk = ctx.volPrev != null && ctx.volPrev > ctx.avgVol(20);

  if (price <= sma200) return null; // trend gate: only trade above the 200-day average

  // Mean-reversion entry: deep flush to the lower band with weak momentum.
  if (price <= lower && rsi < 40 && volOk) {
    st.entryType = 'mr';
    const qty = Math.min(0.015 * ctx.cash / atr, ctx.cash / price * 0.9); // risk 1.5% of equity per trade
    return { side: 'buy', qty };
  }

  // Momentum entry: squeeze breakout above the upper band.
  if (price > upper && squeeze && volOk) {
    st.entryType = 'brk';
    const qty = Math.min(0.015 * ctx.cash / atr, ctx.cash / price * 0.9);
    return { side: 'buy', qty };
  }

  // Bull sleeve: strong regime only, buy a fresh 90-day high, ride until EMA20 flips.
  const sma50 = ctx.sma(50, 1);
  const high90 = ctx.high(90, 1);
  if (sma50 != null && high90 != null && price > sma200 * 1.15 && sma50 > sma200 && price > high90 && volOk) {
    st.entryType = 'trend';
    const qty = Math.min(0.012 * ctx.cash / atr, ctx.cash / price * 0.9); // slightly smaller: trend trades whipsaw more
    return { side: 'buy', qty };
  }

  return null;
}
