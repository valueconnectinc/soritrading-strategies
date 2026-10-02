function onUpdate(ctx) {
  // F3-d probe: long/short flip on SMA(5)/SMA(20), 30x, 60% of margin
  const fast = ctx.sma(5), slow = ctx.sma(20)
  if (fast == null || slow == null) return null
  const qty = (ctx.cash * 30 * 0.6) / ctx.price
  if (fast > slow && ctx.position <= 0) return { side: 'buy', qty: qty + Math.abs(ctx.position) }
  if (fast < slow && ctx.position >= 0) return { side: 'sell', qty: qty + Math.abs(ctx.position) }
  return null
}
