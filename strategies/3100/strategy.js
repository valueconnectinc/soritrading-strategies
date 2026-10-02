// EURUSD 1h — mean reversion inside the daily trend.
// Long: above EMA(200), last close below BB(20,2) lower band, RSI(2) < 10. Exit at BB mid, or 3*ATR stop, or 36-bar time stop.
// Short: mirror. Risk 0.75% of equity per trade. London/NY entries only (07-20 UTC).
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

  const RISK = 0.0075, STOP_K = 3, MAX_LEV = 10, TIME_STOP = 36
  const c1 = ctx.sma(1, 1)
  const bb = ctx.bb(20, 2, 1)
  const rsi = ctx.rsi(2, 1)
  const ema = ctx.ema(200, 1)
  const atr = ctx.atr(14, 1)
  if (c1 == null || !bb || bb.lower == null || rsi == null || ema == null || atr == null || atr <= 0) { s.blocked.nullInd = (s.blocked.nullInd || 0) + 1; return null }

  let t = ctx.candle && ctx.candle.t
  if (t != null && t < 1e11) t = t * 1000
  const hour = t > 1e11 ? new Date(t).getUTCHours() : null
  const inSession = hour == null || (hour >= 7 && hour < 20)

  const px = ctx.price
  const equity = ctx.cash + (ctx.uPnl || 0)

  if (hasPos) {
    s.held = (s.held || 0) + 1
    if (ctx.position > 0 && (c1 >= bb.mid || s.held > TIME_STOP)) { s.stop = null; return { side: 'sell', qty: ctx.position } }
    if (ctx.position < 0 && (c1 <= bb.mid || s.held > TIME_STOP)) { s.stop = null; return { side: 'buy', qty: -ctx.position } }
    return null
  }

  if (!inSession) { s.blocked.session = (s.blocked.session || 0) + 1; return null }
  const stopDist = STOP_K * atr
  const qty = Math.min((equity * RISK) / stopDist, (equity * MAX_LEV * 0.9) / px)
  if (qty <= 0) return null

  if (c1 > ema && c1 < bb.lower && rsi < 10) { s.stop = px - stopDist; s.held = 0; return { side: 'buy', qty } }
  if (c1 < ema && c1 > bb.upper && rsi > 90) { s.stop = px + stopDist; s.held = 0; return { side: 'sell', qty } }
  s.blocked.noSignal = (s.blocked.noSignal || 0) + 1
  return null
}
