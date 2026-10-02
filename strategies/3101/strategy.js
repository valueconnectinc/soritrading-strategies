// EURUSD 4h — trade pullbacks in the direction of the EMA(50)/EMA(200) regime.
// Long: EMA50 > EMA200, RSI(14) dipped below 40 within the last 6 bars, last close back above EMA(20).
// Stop 2.5*ATR(14), take profit 2R, exit if regime flips. Risk 1% per trade. Short mirrored.
function onUpdate(ctx) {
  const s = ctx.state
  s.blocked = s.blocked || {}
  const hasPos = ctx.position !== 0
  if (hasPos && s.stop != null) {
    if (ctx.position > 0 && (ctx.price <= s.stop || ctx.price >= s.tp)) { s.stop = null; return { side: 'sell', qty: ctx.position } }
    if (ctx.position < 0 && (ctx.price >= s.stop || ctx.price <= s.tp)) { s.stop = null; return { side: 'buy', qty: -ctx.position } }
  }
  if (s.lastBar === ctx.i) return null
  s.lastBar = ctx.i

  const RISK = 0.01, STOP_K = 2.5, TP_R = 2, MAX_LEV = 10, LOOK = 6
  const c1 = ctx.sma(1, 1)
  const e20 = ctx.ema(20, 1), e50 = ctx.ema(50, 1), e200 = ctx.ema(200, 1)
  const atr = ctx.atr(14, 1)
  if (c1 == null || e20 == null || e50 == null || e200 == null || atr == null || atr <= 0) { s.blocked.nullInd = (s.blocked.nullInd || 0) + 1; return null }
  let minRsi = 100, maxRsi = 0
  for (let k = 1; k <= LOOK; k++) { const r = ctx.rsi(14, k); if (r == null) { minRsi = null; break } if (r < minRsi) minRsi = r; if (r > maxRsi) maxRsi = r }
  if (minRsi == null) { s.blocked.nullRsi = (s.blocked.nullRsi || 0) + 1; return null }

  const px = ctx.price
  const equity = ctx.cash + (ctx.uPnl || 0)
  const up = e50 > e200, down = e50 < e200

  if (hasPos) {
    if (ctx.position > 0 && !up) { s.stop = null; return { side: 'sell', qty: ctx.position } }
    if (ctx.position < 0 && !down) { s.stop = null; return { side: 'buy', qty: -ctx.position } }
    return null
  }

  const stopDist = STOP_K * atr
  const qty = Math.min((equity * RISK) / stopDist, (equity * MAX_LEV * 0.9) / px)
  if (qty <= 0) return null
  const c2 = ctx.sma(1, 2), e20p = ctx.ema(20, 2)
  if (c2 == null || e20p == null) return null

  if (up && minRsi < 40 && c2 <= e20p && c1 > e20) { s.stop = px - stopDist; s.tp = px + TP_R * stopDist; return { side: 'buy', qty } }
  if (down && maxRsi > 60 && c2 >= e20p && c1 < e20) { s.stop = px + stopDist; s.tp = px - TP_R * stopDist; return { side: 'sell', qty } }
  s.blocked.noSignal = (s.blocked.noSignal || 0) + 1
  return null
}
