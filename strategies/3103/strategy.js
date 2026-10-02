// EURUSD 1h — session-structure strategy.
// Asian range = high/low of the 00:00-06:59 UTC bars. During London open (07:00-10:59 UTC) a closed 1h bar beyond the range
// enters in that direction. Stop = range midpoint, target = 1x range height, time exit at 20:00 UTC. One trade per day.
// Range filter: 0.12% .. 0.6% of price. Risk 1% of equity per trade (position sized from the stop distance).
function onUpdate(ctx) {
  const s = ctx.state
  s.blocked = s.blocked || {}
  const RISK = 0.01, MAX_LEV = 10, TP_R = 1.0, MIN_RANGE = 0.0012, MAX_RANGE = 0.006
  let t = ctx.candle && ctx.candle.t
  if (t == null) return null
  if (t < 1e11) t = t * 1000
  const d = new Date(t)
  const hour = d.getUTCHours()
  const day = Math.floor(t / 86400000)
  const px = ctx.price
  const hasPos = ctx.position !== 0

  // intrabar stop / target (every sub-event)
  if (hasPos && s.stop != null) {
    if (ctx.position > 0 && (px <= s.stop || px >= s.tp)) { s.stop = null; return { side: 'sell', qty: ctx.position } }
    if (ctx.position < 0 && (px >= s.stop || px <= s.tp)) { s.stop = null; return { side: 'buy', qty: -ctx.position } }
  }

  // new day: reset the range
  if (s.day !== day) { s.day = day; s.rHi = null; s.rLo = null; s.traded = false }
  // build the Asian range from the forming bar's running high/low (last write of the bar = final high/low)
  if (hour < 7) {
    const h = ctx.candle.h, l = ctx.candle.l
    const key = 'b' + ctx.i
    s.bars = s.bars || {}
    s.bars[key] = [h, l]
    // recompute from this day's asian bars only
    let hi = null, lo = null
    for (const k in s.bars) { const v = s.bars[k]; if (hi == null || v[0] > hi) hi = v[0]; if (lo == null || v[1] < lo) lo = v[1] }
    s.rHi = hi; s.rLo = lo
  } else if (s.bars && Object.keys(s.bars).length) {
    s.bars = {}   // asian window closed — freeze range
  }

  if (s.lastBar === ctx.i) return null
  s.lastBar = ctx.i

  // time exit
  if (hasPos && hour >= 20) {
    s.stop = null
    return ctx.position > 0 ? { side: 'sell', qty: ctx.position } : { side: 'buy', qty: -ctx.position }
  }
  if (hasPos) return null
  if (hour < 7 || hour > 10) { s.blocked.window = (s.blocked.window || 0) + 1; return null }
  if (s.traded) { s.blocked.traded = (s.blocked.traded || 0) + 1; return null }
  if (s.rHi == null || s.rLo == null) { s.blocked.noRange = (s.blocked.noRange || 0) + 1; return null }
  const range = s.rHi - s.rLo
  if (range / px < MIN_RANGE || range / px > MAX_RANGE) { s.blocked.rangeSize = (s.blocked.rangeSize || 0) + 1; return null }

  const c1 = ctx.sma(1, 1)   // last closed bar's close
  if (c1 == null) return null
  const equity = ctx.cash + (ctx.uPnl || 0)
  const mid = (s.rHi + s.rLo) / 2

  if (c1 > s.rHi) {
    const stopDist = px - mid
    if (stopDist <= 0) return null
    const qty = Math.min((equity * RISK) / stopDist, (equity * MAX_LEV * 0.9) / px)
    s.stop = mid; s.tp = px + TP_R * range; s.traded = true
    return { side: 'buy', qty }
  }
  if (c1 < s.rLo) {
    const stopDist = mid - px
    if (stopDist <= 0) return null
    const qty = Math.min((equity * RISK) / stopDist, (equity * MAX_LEV * 0.9) / px)
    s.stop = mid; s.tp = px - TP_R * range; s.traded = true
    return { side: 'sell', qty }
  }
  s.blocked.noSignal = (s.blocked.noSignal || 0) + 1
  return null
}
