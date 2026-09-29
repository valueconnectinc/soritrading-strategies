/*
 * @coinsori-strategy v1
 * name: Multi-Asset Defensive MR Basket 6-Asset + Melt-up Overlay
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, BNBUSDT, ADAUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The 6-asset defensive MR basket is the validated champion, but it
 * sits at 0% in sustained melt-ups (e.g. 2023-24 SOL +973% while the strategy returned 0).
 * This version adds a SECOND mode: ride an established uptrend so it captures part of a
 * strong bull, while keeping the MR dip-buying as the primary engine. The two modes are
 * mutually exclusive — MR signals always take priority; trend-ride only fills the gaps.
 * When it buys and sells: MR mode buys below the lower Bollinger(20,2.5)+RSI<30, or below
 * the ATR-Keltner low+RSI<40, in a rising 200-day average; exits on EMA20 snap-back or a
 * 2.5-ATR trailing stop. Trend mode (only when no MR signal and already in a strong uptrend:
 * price>EMA100>EMA200, both rising) buys and holds a full position, exiting on a close below
 * the EMA100 or when the 200-day trend turns down.
 * When it does NOT work: In a broad bear both modes stay flat (safe, little upside). The
 * trend mode gives back some of its gain in a choppy range because EMA100 whipsaws, and it
 * can enter near a local top right before a pullback — the MR engine does not protect a
 * trend position. Tested as a pure overlay; if it hurts the validated bear/chop windows it
 * is rejected.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const bb = ctx.bb(20, 2.5, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  const ema20 = ctx.ema(20, 1);
  const ema100 = ctx.ema(100, 1);
  const ema100prev = ctx.ema(100, 2);
  const atr = ctx.atr(14, 1);
  if (bb == null || rsi == null || sma200 == null || sma200prev == null || ema20 == null ||
      ema100 == null || ema100prev == null || atr == null || atr <= 0) return null;

  const uptrend = sma200 > sma200prev;
  const lowerBand = bb.lower;
  const keltnerLow = ema20 - 2.5 * atr;
  const mode = ctx.state.mode || 'mr';

  if (pos > 0) {
    const entry = ctx.state.high ? Math.max(ctx.state.high, price) : price;
    ctx.state.high = entry;
    const trailStop = entry - 2.5 * atr;
    if (mode === 'mr') {
      // MR exit: snap-back above the 20-day EMA or trailing stop.
      if (price > ema20 || price < trailStop) {
        ctx.state.mode = 'mr';
        return { side: 'sell', qty: pos };
      }
      return null;
    }
    // Trend exit: close below EMA100 or 200-day trend turn-down.
    if (price < ema100 || !uptrend) {
      ctx.state.mode = 'mr';
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (!uptrend) return null;

  // MR signals always take priority.
  const bollingerFlush = price < lowerBand && rsi < 30;
  const keltnerPullback = price < keltnerLow && rsi < 40;
  if (bollingerFlush || keltnerPullback) {
    const legCash = ctx.cash;
    const riskEq = 0.03 * legCash;
    const qty = riskEq / atr;
    const maxQty = (legCash / price) * 0.9;
    ctx.state.mode = 'mr';
    return { side: 'buy', qty: Math.min(qty, maxQty) };
  }

  // Trend mode: only in a strong sustained uptrend (price>EMA100>EMA200, both rising).
  const strongTrend = price > ema100 && ema100 > sma200 && ema100 > ema100prev && uptrend;
  if (strongTrend) {
    ctx.state.mode = 'trend';
    const qty = (ctx.cash / price) * 0.9;
    return { side: 'buy', qty: qty };
  }
  return null;
}
