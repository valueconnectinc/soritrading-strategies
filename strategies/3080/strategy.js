function onUpdate(ctx) {
  // F3-d stop-out probe: open one LONG at 30x using 95% of margin at bar 30, never exit (EURUSD fell ~3% in this window)
  if (ctx.i === 30 && ctx.position === 0) return { side: 'buy', qty: (ctx.cash * 30 * 0.95) / ctx.price }
  if (ctx.i === 31) ctx.log('stopOutPx=' + ctx.liqPx + ' entry=' + ctx.entryPx)
  return null
}
