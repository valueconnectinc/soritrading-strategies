// EURUSD 4h — pullback entries in the EMA(50)/EMA(200) regime.
// v1.1: stop as a TRIGGER order and target as a LIMIT order (engine evaluates against the bar's high/low —
//       a ctx.price check fills systematically worse). Stop 2.5*ATR(14), target 2R, regime-flip exit. Risk 1%.
function onUpdate(ctx) {
  const s = ctx.state
  s.blocked = s.blocked || {}
  const hasPos = ctx.position !== 0
  if (s.lastBar === ctx.i) return null
  s.lastBar = ctx.i

  const RISK = 0.01, STOP_K = 2.5, TP_R = 2, MAX_LEV = 10, LOOK = 6
  const c1 = ctx.sma(1, 1)
  const e20 = ctx.ema(20, 1), e50 = ctx.ema(50, 1), e200 = ctx.ema(200, 1)
  const atr = ctx.atr(14, 1)
  if (c1 == null || e20 == null || e50 == null || e200 == null || atr == null || atr <= 0) { s.blocked.nullInd = (s.blocked.nullInd || 0) + 1; return null }
  let minRsi = 100, maxRsi = 0
  for (let k = 1; k <= LOOK; k++) { const r = ctx.rsi(14, k); if (r == null) { minRsi = null; break } if (r < minRsi) minRsi = r; if (r > maxRsi) maxRsi = r }
  if (minRsi == null) return null

  const px = ctx.price
  const equity = ctx.cash + (ctx.uPnl || 0)
  const up = e50 > e200, down = e50 < e200

  if (hasPos) {
    if (ctx.position > 0 && !up) return [{ cancel: 'all' }, { side: 'sell', qty: ctx.position }]
    if (ctx.position < 0 && !down) return [{ cancel: 'all' }, { side: 'buy', qty: -ctx.position }]
    return null
  }
  if (s.open) { s.open = false; return { cancel: 'all' } }   // stop or target fired — drop the other resting order

  const stopDist = STOP_K * atr
  const qty = Math.min((equity * RISK) / stopDist, (equity * MAX_LEV * 0.9) / px)
  if (qty <= 0) return null
  const c2 = ctx.sma(1, 2), e20p = ctx.ema(20, 2)
  if (c2 == null || e20p == null) return null

  if (up && minRsi < 40 && c2 <= e20p && c1 > e20) {
    s.open = true
    return [{ side: 'buy', qty },
      { side: 'sell', qty, type: 'smart', trigger: { type: 'stop', px: px - stopDist } },
      { side: 'sell', qty, type: 'limit', price: px + TP_R * stopDist }]
  }
  if (down && maxRsi > 60 && c2 >= e20p && c1 < e20) {
    s.open = true
    return [{ side: 'sell', qty },
      { side: 'buy', qty, type: 'smart', trigger: { type: 'stop', px: px + stopDist } },
      { side: 'buy', qty, type: 'limit', price: px - TP_R * stopDist }]
  }
  s.blocked.noSignal = (s.blocked.noSignal || 0) + 1
  return null
}
