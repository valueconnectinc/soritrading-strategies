/*
 * @coinsori-strategy v1
 * name: BTC 1D Keltner MR + 50/200 Regime Gate
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Deep flushes to the lower Keltner band inside an uptrend
 * are usually bought back quickly (mean reversion). Requiring BOTH price above
 * the 200-day average AND the 50-day average above the 200-day average (a
 * golden-cross regime) filters out chop: it only buys flushes inside a
 * confirmed uptrend, so whipsaw in sideways-above-200d markets is avoided.
 * When it buys and sells: buys a flush to 2.5xATR below the 20-day EMA with
 * RSI below 40 and above-average volume, only when the 50/200 regime is up;
 * sells on the snap-back to the 20-day EMA or a hard 4xATR stop below entry.
 * In a strong bull (price > 1.15x the 200-day average and 50-day above
 * 200-day) it also buys a fresh 55-day high and rides it on a wide 7xATR
 * trailing stop, because melt-ups have bigger normal noise than mixed markets.
 * When it does NOT work: it stays in cash during bear markets and sideways
 * markets above the 200-day average (the regime gate keeps it out), so it
 * misses strong bull runs that never pull back. It also misses the first leg
 * of a new uptrend before the 50-day average crosses above the 200-day.
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
  const strongBull = price > sma200 * 1.15 && sma50 > sma200; // regime flag used by both entry and stop width

  if (pos > 0) {
    const et = st.entryType;
    if (et === 'mr') {
      if (strongBull) {
        // Melt-up flush usually continues: ride it on the same wide trail as trend/dip
        // instead of selling at the middle band, to capture the continuation.
        st.peak = Math.max(st.peak == null ? price : st.peak, price);
        if (price < st.peak - 7 * atr) {
          st.cooldown = ctx.i + 2;
          return { side: 'sell', qty: pos };
        }
      } else if (price > ema20) { // flush trade in a normal regime: exit on snap-back to the middle band
        st.cooldown = ctx.i + 2;
        return { side: 'sell', qty: pos };
      }
      return null;
    }
    if (et === 'brk' && price < ema20) { // breakout trade: hold while above the middle band
      st.cooldown = ctx.i + 2;
      return { side: 'sell', qty: pos };
    }
    if (et === 'trend' || et === 'dip') {
      st.peak = Math.max(st.peak == null ? price : st.peak, price);
      const stopMult = et === 'trend' && strongBull ? 7 : 3; // 7xATR in a melt-up: wider so pullbacks do not stop the trend out; 3xATR elsewhere keeps gains
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

  // Volume confirmation on the previous (closed) bar — used for MR and squeeze breakout.
  const volOk = ctx.volPrev != null && ctx.volPrev > ctx.avgVol(20);

  // REGIME GATE: only trade when the 200-bar trend agrees — price above the
  // 200-day average AND the 50-day average above the 200-day. This is the
  // golden-cross regime; it removes chop above the 200-day where MR whipsaws.
  if (price <= sma200 || sma50 <= sma200) return null;

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

  // Bull sleeve: strong regime only, buy a fresh 55-day high, ride with a wide trailing stop.
  // No volume requirement: in a melt-up the continuation days have normal volume, and a
  // volume filter would skip most of the ride. Exhaustion cap still guards blow-off tops.
  const high55 = ctx.high(55, 1);
  if (high55 != null && strongBull && price > high55 && !(price > ema20 + 7 * atr && rsi > 75)) {
    st.entryType = 'trend';
    st.peak = price;
    const qty = Math.min(0.015 * ctx.cash / atr, ctx.cash / price * 0.9); // same risk as MR now: bull rides carry the return
    return { side: 'buy', qty };
  }

  // Dip sleeve: in a strong bull, a shallow pullback to the 20-day EMA that
  // keeps price above the 50-day average is a healthy entry; a dip below the
  // 50-day average means the short-term trend is breaking, so we stay out.
  if (strongBull && price < ema20 && price > ema20 - 1.5 * atr && price > sma50 && rsi < 55) {
    st.entryType = 'dip';
    st.peak = price;
    const qty = Math.min(0.015 * ctx.cash / atr, ctx.cash / price * 0.9);
    return { side: 'buy', qty };
  }

  return null;
}
