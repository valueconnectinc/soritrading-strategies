// EURUSD 1h — Donchian(55) breakout in the direction of EMA(200), ATR-sized risk, session filter.
// Long and short (cfd). Risk 1% of equity per trade, stop = 2*ATR(14), trail after 1R, time stop 72 bars.
function onUpdate(ctx) {
  const s = ctx.state
  // once per bar (sub-events only serve the stop check below)
  const hasPos = ctx.position !== 0
  if (hasPos && s.stop != null) {
    // intrabar stop check on every sub-event (O->L/H->C path)
    if (ctx.position > 0 && ctx.price <= s.stop) { s.stop = null; return { side: 'sell', qty: ctx.position } }
    if (ctx.position < 0 && ctx.price >= s.stop) { s.stop = null; return { side: 'buy', qty: -ctx.position } }
  }
  if (s.lastBar === ctx.i) return null
  s.lastBar = ctx.i

  const N = 55, ATR_N = 14, STOP_K = 2, RISK = 0.01, MAX_LEV = 10, TIME_STOP = 72
  const c1 = ctx.sma(1, 1)               // last closed bar's close
  const hi = ctx.high(N, 2), lo = ctx.low(N, 2)   // channel of the N bars before that
  const ema = ctx.ema(200, 1)
  const atr = ctx.atr(ATR_N, 1)
  if (c1 == null || hi == null || lo == null || ema == null || atr == null || atr <= 0) return null

  // session filter: London + NY (07:00-20:00 UTC) for entries only
  const t = ctx.candle && ctx.candle.t
  const hour = t > 1e9 ? new Date(t).getUTCHours() : null
  const inSession = hour == null || (hour >= 7 && hour < 20)

  const px = ctx.price
  const equity = ctx.cash + (ctx.uPnl || 0)

  if (hasPos) {
    s.held = (s.held || 0) + 1
    // trail: once 1R in profit, trail stop at entry (breakeven) then by 2*ATR from the best close
    if (ctx.position > 0) {
      s.best = Math.max(s.best || c1, c1)
      if (s.best - s.entry >= STOP_K * atr) s.stop = Math.max(s.stop, s.best - STOP_K * atr, s.entry)
      if (c1 < ema || s.held > TIME_STOP) { s.stop = null; return { side: 'sell', qty: ctx.position } }
    } else {
      s.best = Math.min(s.best || c1, c1)
      if (s.entry - s.best >= STOP_K * atr) s.stop = Math.min(s.stop, s.best + STOP_K * atr, s.entry)
      if (c1 > ema || s.held > TIME_STOP) { s.stop = null; return { side: 'buy', qty: -ctx.position } }
    }
    return null
  }

  if (!inSession) return null
  const stopDist = STOP_K * atr
  const riskQty = (equity * RISK) / stopDist
  const maxQty = (equity * MAX_LEV * 0.9) / px
  const qty = Math.min(riskQty, maxQty)
  if (qty <= 0) return null

  if (c1 > hi && c1 > ema) {
    s.entry = px; s.stop = px - stopDist; s.best = px; s.held = 0
    return { side: 'buy', qty }
  }
  if (c1 < lo && c1 < ema) {
    s.entry = px; s.stop = px + stopDist; s.best = px; s.held = 0
    return { side: 'sell', qty }
  }
  return null
}
