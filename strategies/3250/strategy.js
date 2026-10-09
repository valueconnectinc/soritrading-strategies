/*
 * @coinsori-strategy v1
 * name: ETH 1D Keltner MR + Squeeze (fresh-tuned)
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: ETH's daily chart mean-reverts more violently than BTC —
 * deep flushes to the lower Keltner band inside an uptrend snap back quickly,
 * and low-volatility squeezes that break out tend to keep trending. The BTC
 * champion's parameters do NOT transfer to ETH (tested and recorded), so every
 * knob here is re-tuned for ETH's wider ATR and deeper corrections.
 * When it buys and sells: buys a flush to the lower band with RSI below 35,
 * or a squeeze breakout above the upper band, both only above the 200-day
 * average with above-average volume. A flush trade sells on the snap-back to
 * the middle band; a breakout trade sells below the middle band; any trade is
 * stopped out at 3xATR below its peak as a safety net.
 * When it does NOT work: in a persistent downtrend it stays in cash and misses
 * the eventual recovery; in a sideways chop above the 200-day average the MR
 * entry can buy a falling knife repeatedly. It underperforms buy-and-hold in
 * strong bull years that never pull back. Defensive first.
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

  const lower = ema20 - 2.5 * atr; // 2.5xATR: deep enough to be a real flush on ETH's wider ATR
  const upper = ema20 + 2.5 * atr;
  const st = ctx.state;

  if (pos > 0) {
    const et = st.entryType;
    st.peak = Math.max(st.peak == null ? price : st.peak, price);
    // 3xATR safety stop: ETH can fall far from a flush entry; cut a breakdown early
    if (price < st.peak - 3 * atr) {
      st.cooldown = ctx.i + 2;
      return { side: 'sell', qty: pos };
    }
    if (et === 'mr' && price > ema20) { // flush trade: exit on snap-back to the middle band
      st.cooldown = ctx.i + 2;
      return { side: 'sell', qty: pos };
    }
    if (et === 'brk' && price < ema20) { // breakout trade: hold while above the middle band
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
  // RSI<35 (not 40): ETH's corrections overshoot harder, so a lower bar is needed.
  if (price <= lower && rsi < 35 && volOk) {
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

  return null;
}
