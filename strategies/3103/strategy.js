// EURUSD 1h — Asian range (00:00-06:59 UTC) → London breakout (07:00-10:59 UTC). One trade per day.
// v2: exits by TRIGGER stop + LIMIT target (the engine judges those against the bar's high/low; a ctx.price check
//     lands on the next sub-event and fills systematically worse). Stop = range midpoint, target = 1x range, time exit 20:00 UTC.
// Range filter 0.12%..0.6% of price. Risk 1% of equity per trade.
function onUpdate(ctx) {
  const s = ctx.state
  s.blocked = s.blocked || {}
  const RISK = 0.01, MAX_LEV = 10, TP_R = 1.0, MIN_RANGE = 0.0012, MAX_RANGE = 0.006
  let t = ctx.candle && ctx.candle.t
  if (t == null) return null
  if (t < 1e11) t = t * 1000
  const hour = new Date(t).getUTCHours()
  const day = Math.floor(t / 86400000)
  const px = ctx.price
  const hasPos = ctx.position !== 0

  if (s.day !== day) { s.day = day; s.rHi = null; s.rLo = null; s.traded = false; s.bars = {} }
  if (hour < 7) {
    s.bars = s.bars || {}
    s.bars['b' + ctx.i] = [ctx.candle.h, ctx.candle.l]   // last write of a bar = its final high/low
    let hi = null, lo = null
    for (const k in s.bars) { const v = s.bars[k]; if (hi == null || v[0] > hi) hi = v[0]; if (lo == null || v[1] < lo) lo = v[1] }
    s.rHi = hi; s.rLo = lo
  }

  if (s.lastBar === ctx.i) return null
  s.lastBar = ctx.i

  if (hasPos) {
    if (hour >= 20) return [{ cancel: 'all' }, ctx.position > 0 ? { side: 'sell', qty: ctx.position } : { side: 'buy', qty: -ctx.position }]
    return null
  }
  // flat: if the stop or the target fired, the other resting order must go
  if (s.open) { s.open = false; return { cancel: 'all' } }
  if (hour < 7 || hour > 10) { s.blocked.window = (s.blocked.window || 0) + 1; return null }
  if (s.traded) return null
  if (s.rHi == null || s.rLo == null) { s.blocked.noRange = (s.blocked.noRange || 0) + 1; return null }
  const range = s.rHi - s.rLo
  if (range / px < MIN_RANGE || range / px > MAX_RANGE) { s.blocked.rangeSize = (s.blocked.rangeSize || 0) + 1; return null }

  const c1 = ctx.sma(1, 1)
  if (c1 == null) return null
  const equity = ctx.cash + (ctx.uPnl || 0)
  const mid = (s.rHi + s.rLo) / 2

  if (c1 > s.rHi && px > mid) {
    const stopDist = px - mid
    const qty = Math.min((equity * RISK) / stopDist, (equity * MAX_LEV * 0.9) / px)
    s.traded = true; s.open = true
    return [{ side: 'buy', qty },
      { side: 'sell', qty, type: 'smart', trigger: { type: 'stop', px: mid } },
      { side: 'sell', qty, type: 'limit', price: px + TP_R * range }]
  }
  if (c1 < s.rLo && px < mid) {
    const stopDist = mid - px
    const qty = Math.min((equity * RISK) / stopDist, (equity * MAX_LEV * 0.9) / px)
    s.traded = true; s.open = true
    return [{ side: 'sell', qty },
      { side: 'buy', qty, type: 'smart', trigger: { type: 'stop', px: mid } },
      { side: 'buy', qty, type: 'limit', price: px - TP_R * range }]
  }
  s.blocked.noSignal = (s.blocked.noSignal || 0) + 1
  return null
}
