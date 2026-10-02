// EURUSD 1h — Donchian(55) breakout in the direction of EMA(200), ATR-sized risk, London/NY session filter.
// v2: candle.t unit-safe (sec or ms), re-entry cooldown, fresh-breakout requirement.
// Long and short (cfd). Risk 1% of equity per trade, stop = 2*ATR(14), breakeven after 1R, trail 2*ATR, time stop 72 bars.
function onUpdate(ctx) {
  const s = ctx.state
  s.blocked = s.blocked || {}
  const hasPos = ctx.position !== 0
  // intrabar stop check (every sub-event along the O->L/H->C path)
  if (hasPos && s.stop != null) {
    if (ctx.position > 0 && ctx.price <= s.stop) { s.stop = null; s.exitBar = ctx.i; return { side: 'sell', qty: ctx.position } }
    if (ctx.position < 0 && ctx.price >= s.stop) { s.stop = null; s.exitBar = ctx.i; return { side: 'buy', qty: -ctx.position } }
  }
  if (s.lastBar === ctx.i) return null
  s.lastBar = ctx.i

  const N = 55, ATR_N = 14, STOP_K = 2, RISK = 0.01, MAX_LEV = 10, TIME_STOP = 72, COOLDOWN = 12
  const c1 = ctx.sma(1, 1)                        // last closed bar's close
  const hi = ctx.high(N, 2), lo = ctx.low(N, 2)   // channel of the N bars before that
  const ema = ctx.ema(200, 1)
  const atr = ctx.atr(ATR_N, 1)
  if (c1 == null || hi == null || lo == null || ema == null || atr == null || atr <= 0) { s.blocked.nullInd = (s.blocked.nullInd || 0) + 1; return null }

  // session filter (entries only): London + NY = 07:00-20:00 UTC. candle.t may be epoch sec or ms.
  let t = ctx.candle && ctx.candle.t
  if (t != null && t < 1e11) t = t * 1000
  const hour = t > 1e11 ? new Date(t).getUTCHours() : null
  const inSession = hour == null || (hour >= 7 && hour < 20)

  const px = ctx.price
  const equity = ctx.cash + (ctx.uPnl || 0)

  if (hasPos) {
    s.held = (s.held || 0) + 1
    if (ctx.position > 0) {
      s.best = Math.max(s.best || c1, c1)
      if (s.best - s.entry >= STOP_K * atr) s.stop = Math.max(s.stop, s.best - STOP_K * atr, s.entry)
      if (c1 < ema || s.held > TIME_STOP) { s.stop = null; s.exitBar = ctx.i; return { side: 'sell', qty: ctx.position } }
    } else {
      s.best = Math.min(s.best || c1, c1)
      if (s.entry - s.best >= STOP_K * atr) s.stop = Math.min(s.stop, s.best + STOP_K * atr, s.entry)
      if (c1 > ema || s.held > TIME_STOP) { s.stop = null; s.exitBar = ctx.i; return { side: 'buy', qty: -ctx.position } }
    }
    return null
  }

  // flat: track whether price has been back inside the channel since the last exit (fresh breakout only)
  const inside = c1 <= hi && c1 >= lo
  if (inside) s.armed = true
  if (s.exitBar != null && ctx.i - s.exitBar < COOLDOWN) { s.blocked.cooldown = (s.blocked.cooldown || 0) + 1; return null }
  if (!inSession) { s.blocked.session = (s.blocked.session || 0) + 1; return null }
  if (!s.armed) { s.blocked.notArmed = (s.blocked.notArmed || 0) + 1; return null }

  const stopDist = STOP_K * atr
  const riskQty = (equity * RISK) / stopDist
  const maxQty = (equity * MAX_LEV * 0.9) / px
  const qty = Math.min(riskQty, maxQty)
  if (qty <= 0) { s.blocked.qty = (s.blocked.qty || 0) + 1; return null }

  if (c1 > hi && c1 > ema) { s.entry = px; s.stop = px - stopDist; s.best = px; s.held = 0; s.armed = false; return { side: 'buy', qty } }
  if (c1 < lo && c1 < ema) { s.entry = px; s.stop = px + stopDist; s.best = px; s.held = 0; s.armed = false; return { side: 'sell', qty } }
  s.blocked.noSignal = (s.blocked.noSignal || 0) + 1
  return null
}
