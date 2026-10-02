// EURUSD 4h — pullback entries in the EMA(50)/EMA(200) regime; exit by EMA(20) trail instead of a fixed target.
// Long: EMA50 > EMA200, RSI(14) < 40 within the last 6 closed bars, last close back above EMA(20).
// Exit: stop 2*ATR(14) from entry; after >= 1R of favorable close, exit when a close falls back below EMA(20); regime flip exits too.
// Risk 1% per trade. Short mirrored.
function onUpdate(ctx) {
  const s = ctx.state
  s.blocked = s.blocked || {}
  const hasPos = ctx.position !== 0
  if (hasPos && s.stop != null) {
    if (ctx.position > 0 && ctx.price <= s.stop) { s.stop = null; return { side: 'sell', qty: ctx.position } }
    if (ctx.position < 0 && ctx.price >= s.stop) { s.stop = null; return { side: 'buy', qty: -ctx.position } }
  }
  if (s.lastBar === ctx.i) return null
  s.lastBar = ctx.i

  const RISK = 0.01, STOP_K = 2, MAX_LEV = 10, LOOK = 6, MIN_HOLD = 2
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
    s.held = (s.held || 0) + 1
    const r = s.stopDist || atr
    if (ctx.position > 0) {
      if (c1 - s.entry >= r) s.armed = true
      if (!up || (s.armed && s.held >= MIN_HOLD && c1 < e20)) { s.stop = null; return { side: 'sell', qty: ctx.position } }
      if (s.armed) s.stop = Math.max(s.stop, s.entry)   // breakeven once 1R reached
    } else {
      if (s.entry - c1 >= r) s.armed = true
      if (!down || (s.armed && s.held >= MIN_HOLD && c1 > e20)) { s.stop = null; return { side: 'buy', qty: -ctx.position } }
      if (s.armed) s.stop = Math.min(s.stop, s.entry)
    }
    return null
  }

  const stopDist = STOP_K * atr
  const qty = Math.min((equity * RISK) / stopDist, (equity * MAX_LEV * 0.9) / px)
  if (qty <= 0) return null
  const c2 = ctx.sma(1, 2), e20p = ctx.ema(20, 2)
  if (c2 == null || e20p == null) return null

  if (up && minRsi < 40 && c2 <= e20p && c1 > e20) { s.entry = px; s.stop = px - stopDist; s.stopDist = stopDist; s.armed = false; s.held = 0; return { side: 'buy', qty } }
  if (down && maxRsi > 60 && c2 >= e20p && c1 < e20) { s.entry = px; s.stop = px + stopDist; s.stopDist = stopDist; s.armed = false; s.held = 0; return { side: 'sell', qty } }
  s.blocked.noSignal = (s.blocked.noSignal || 0) + 1
  return null
}
