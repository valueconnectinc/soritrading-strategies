function onUpdate(ctx) {
  const fast = ctx.sma(5), slow = ctx.sma(20)
  if (fast == null || slow == null) return null
  if (fast > slow && ctx.position === 0) return { side: 'buy', qty: ctx.cash / ctx.price }
  if (fast < slow && ctx.position > 0) return { side: 'sell', qty: ctx.position }
  return null
}
