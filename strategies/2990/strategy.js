/*
 * @coinsori-strategy v1
 * name: BTC 1D Hybrid MR+Squeeze (ATR Trail Exit)
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: This is the validated champion (Hybrid MR + Squeeze: 200-day trend
 * gate, Keltner pullback + squeeze breakout entries). Its one documented weakness is that
 * the 20-day EMA exit can give back profit in a fast reversal. I replace that exit with a
 * volatility-adaptive ATR trailing stop: we exit only when price falls more than N×ATR from
 * the running high since entry. This adapts to volatility — a wide stop in a volatile bull,
 * a tight stop in calm chop — so it locks in more profit in strong trends and cuts losses
 * faster in sharp reversals, attacking the champion's drawdown.
 * When it buys and sells: Same two entries as the champion (Keltner pullback + squeeze
 * breakout, both inside a rising 200-day trend). Sell when price closes more than N×ATR
 * below the highest high since entry, OR when the 200-day trend turns down.
 * When it does NOT work: The ATR trail can be too wide in a long slow grind, giving back
 * more than the EMA20 exit would. In a violent V-reversal the first bar can gape past the
 * stop. It still misses down-resolving squeezes (long-only).
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  const high20 = ctx.high(20, 1);
  const bb = ctx.bb(20, 2, 1);
  if (ema20 == null || atr == null || rsi == null || sma200 == null || sma200prev == null ||
      high20 == null || bb == null || bb.upper == null || bb.lower == null || atr <= 0) return null;

  const pos = ctx.position;
  const st = ctx.state;

  if (pos > 0) {
    // Track the highest high since entry.
    if (st.hh == null || price > st.hh) st.hh = price;
    // ATR trailing stop: exit if price closes N×ATR below the running high.
    // N=3.0 gives a wide-enough stop to avoid normal volatility but still cuts
    // meaningful reversals faster than waiting for the EMA20 cross.
    const trail = st.hh - 3.0 * atr;
    if (price < trail || sma200 < sma200prev) {
      st.hh = null;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Only trade inside a rising long-term trend (the shared defensive gate).
  const uptrend = sma200 > sma200prev;
  if (!uptrend) return null;

  // Mean-reversion pullback entry: price under the ATR-adaptive lower Keltner band + weak RSI.
  const lowerBand = ema20 - 2.5 * atr;
  const mrEntry = price < lowerBand && rsi < 40;

  // Squeeze-breakout entry: Bollinger width in quietest 20% of last 100 bars + 20-day high break.
  const width = (bb.upper - bb.lower) / ((bb.upper + bb.lower) / 2);
  let pctile = 0.5;
  const lookback = 100;
  if (ctx.i >= lookback) {
    let countBelow = 0;
    let total = 0;
    for (let k = 1; k <= lookback; k++) {
      const b = ctx.bb(20, 2, k);
      if (b == null || b.upper == null || b.lower == null) continue;
      const w = (b.upper - b.lower) / ((b.upper + b.lower) / 2);
      total++;
      if (w > width) countBelow++;
    }
    if (total > 0) pctile = countBelow / total;
  }
  const squeezeBreakout = pctile <= 0.2 && price > high20 && width > 0;

  if (mrEntry || squeezeBreakout) {
    const equity = ctx.cash + ctx.uPnl;
    const qty = (Number.isFinite(equity) && equity > 0 ? equity : ctx.cash) / price;
    st.hh = price;
    return { side: 'buy', qty: qty * 0.98 };
  }
  return null;
}
