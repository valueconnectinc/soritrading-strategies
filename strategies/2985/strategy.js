/*
 * @coinsori-strategy v1
 * name: BTC 1D Hybrid MR + Squeeze w/ Chandelier Exit
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Combines my two validated BTC 1D edges — mean-reversion pullback and
 * volatility-squeeze breakout — inside one rising 200-day trend gate. The change this cycle:
 * the old exit (price below the 20-day EMA) was too tight and gave back bull gains. This
 * version uses a chandelier ATR trailing stop (highest high since entry minus a multiple of
 * ATR), which lets winners run further in a bull while still cutting losers short.
 * When it buys and sells: Buy when the 200-day average is rising AND either (a) price closes
 * above the 20-day high during a Bollinger squeeze, or (b) price dips below the ATR-adaptive
 * lower Keltner band with weak RSI. Sell when price closes below the trailing chandelier stop
 * (max high since entry minus 3x ATR) or the long-term trend turns down.
 * When it does NOT work: In a broad bear the rising-trend gate keeps us flat (capital-safe
 * but little upside). A squeeze resolved downward is missed (long-only). A sudden crash can
 * gap through the trailing stop. In a flat tight range the squeeze can fire then reverse.
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

  if (pos > 0) {
    // Track the highest close since entry (chandelier trailing stop).
    const entryI = ctx.state.entryI != null ? ctx.state.entryI : ctx.i;
    let highSince = price;
    for (let k = 1; k <= (ctx.i - entryI); k++) {
      const h = ctx.high(1, k);
      if (h != null && h > highSince) highSince = h;
    }
    const stop = highSince - 3 * atr; // 3x ATR trail: wide enough to avoid noise, tight enough to protect.
    if (price < stop || sma200 < sma200prev) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const uptrend = sma200 > sma200prev;
  if (!uptrend) return null;

  const lowerBand = ema20 - 2.5 * atr;
  const mrEntry = price < lowerBand && rsi < 40;

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
    return { side: 'buy', qty: qty * 0.98 };
  }
  return null;
}
