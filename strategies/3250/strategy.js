/*
 * @coinsori-strategy v1
 * name: BTC 1D Hybrid MR + Squeeze + Bull Sleeve (adaptive stop)
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Deep flushes to the lower Keltner band inside an uptrend
 * are usually bought back quickly (mean reversion), and low-volatility squeezes
 * that break out tend to keep trending (momentum). In a strong bull regime a
 * fresh 90-day high is bought and ridden with a trend exit, because melt-ups
 * move further and have bigger normal noise than mixed markets.
 * When it buys and sells: buys a flush to the lower band with RSI below 40, or
 * a squeeze breakout above the upper band, both only above the 200-day average
 * and with above-average volume; in a strong bull regime it also buys a fresh
 * 90-day high, or a shallow dip back to the 20-day EMA (a normal pullback in
 * an uptrend, not a crash, so price must still be above the 50-day average).
 * A flush trade sells on the snap-back to the middle band, a breakout trade
 * sells below the middle band, and a bull/dip trade in a strong bull rides
 * until price closes below the 20-day EMA (let winners run in a melt-up);
 * outside a strong bull a bull/dip trade sells on a 3xATR trailing stop.
 * When it does NOT work: in a persistent downtrend it stays in cash, and in a
 * choppy sideways market above the 200-day average the bull sleeve can whipsaw.
 * It underperforms buy-and-hold in strong bull years that never pull back at
 * all, and it pays fees on every round trip. Defensive first.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  // Closed bars only -> identical in backtest, paper and live.
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma50 = ctx.sma(50, 1);
  const rsi = ctx.rsi(14, 1);
  if (ema20 == null || atr == null || sma200 == null || sma50 == null || rsi == null || atr <= 0) return null;

  const lower = ema20 - 2.5 * atr; // 2.5xATR: deep enough to be a real flush, rare enough to avoid overtrading
  const upper = ema20 + 2.5 * atr;
  const st = ctx.state;
  const strongBull = price > sma200 * 1.15 && sma50 > sma200; // regime flag used by both entry and exit

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
    if (et === 'trend' || et === 'dip') {
      if (strongBull && price < ema20) { // melt-up trend exit: ride until the 20-day EMA breaks, lets winners run
        st.cooldown = ctx.i + 2;
        return { side: 'sell', qty: pos };
      }
      st.peak = Math.max(st.peak == null ? price : st.peak, price);
      const stopMult = strongBull ? 5 : 3; // 5xATR in a melt-up so normal noise does not stop us out; 3xATR elsewhere keeps gains
      if (price < st.peak - stopMult * atr) {
        st.cooldown = ctx.i + 2;
        return { side: 'sell', qty: pos };
      }
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

  // Bull sleeve: strong regime only, buy a fresh 90-day high, ride with a trend exit.
  const high90 = ctx.high(90, 1);
  if (high90 != null && strongBull && price > high90 && volOk) {
    st.entryType = 'trend';
    st.peak = price;
    const qty = Math.min(0.012 * ctx.cash / atr, ctx.cash / price * 0.9); // slightly smaller: trend trades whipsaw more
    return { side: 'buy', qty };
  }

  // Dip sleeve: in a strong bull, a shallow pullback to the 20-day EMA that
  // keeps price above the 50-day average is a healthy entry; a dip below the
  // 50-day average means the short-term trend is breaking, so we stay out.
  if (strongBull && price < ema20 && price > ema20 - 1.5 * atr && price > sma50 && rsi < 55 && volOk) {
    st.entryType = 'dip';
    st.peak = price;
    const qty = Math.min(0.012 * ctx.cash / atr, ctx.cash / price * 0.9);
    return { side: 'buy', qty };
  }

  return null;
}
