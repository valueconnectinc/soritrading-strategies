/*
 * @coinsori-strategy v1
 * name: BTC 4H US-Session Keltner MR
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Crypto liquidity and volatility are not uniform across the 24h day.
 * The US afternoon/evening session carries the bulk of institutional flow and the largest
 * intraday swings, so pullbacks in that window are more likely to mean-revert cleanly.
 * This is a calendar/session-aware mean-reversion — a different dimension from pure
 * price-based entries, and fully testable with price+time data alone.
 * When it buys and sells: buys when price closes below EMA20 minus 2.5x ATR with RSI(14)<40
 * AND the candle falls in the US afternoon/evening window; sells when price recovers above
 * the 20-EMA. 2-bar cooldown cuts whipsaw.
 * When it does NOT work: the session filter cuts entries sharply, so in a quiet regime with
 * few US-session dips it sits in cash and misses moves; if the session timing is miscalibrated
 * for the asset it adds nothing but fewer trades.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const rsi = ctx.rsi(14, 1);
  if (ema20 == null || atr == null || atr <= 0 || rsi == null) return null;

  const pos = ctx.position;
  const st = ctx.state;
  let cd = st.cd || 0;
  if (cd > 0) cd--;
  st.cd = cd;

  if (pos > 0) {
    if (price > ema20 && cd === 0) {
      st.cd = 2;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Read the candle timestamp from whatever field the engine exposes.
  const c = ctx.candle;
  let ts = null;
  if (c != null) {
    if (typeof c.ts === 'number') ts = c.ts;
    else if (typeof c.time === 'number') ts = c.time;
    else if (typeof c.t === 'number') ts = c.t;
    else if (typeof c.openTime === 'number') ts = c.openTime;
  }
  // If no timestamp, fall back to a session-agnostic entry so the strategy still trades
  // and we can tell from the trade count whether the calendar filter is the binding constraint.
  let inUsSession = false;
  if (ts != null) {
    const hour = (Math.floor(ts / 3600) % 24 + 24) % 24;
    inUsSession = (hour === 16 || hour === 20); // US afternoon/evening 4h closes
  } else {
    inUsSession = true; // unknown timestamp => don't block
  }

  const keltnerLow = ema20 - 2.5 * atr;
  if (price < keltnerLow && rsi < 40 && inUsSession && cd === 0) {
    st.cd = 2;
    return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
  }
  return null;
}
