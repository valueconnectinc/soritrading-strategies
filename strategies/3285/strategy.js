/*
 * @coinsori-strategy v1
 * name: Qty Diagnostic Probe
 * ex: binance
 * syms: BTC
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: DIAGNOSTIC ONLY. Buys a fixed 0.5 BTC every bar and sells after
 * 5 bars, to reveal how the engine treats the qty field in orders.
 * When it buys and sells: Buys 0.5 BTC on every bar; sells after holding 5 bars.
 * When it does NOT work: Not a real strategy — probe only, ignore its returns.
 */
function onUpdate(ctx) {
  const holdBars = 5;
  const fixedQty = 0.5; // deliberately small, fixed quantity in coins
  if (ctx.position === 0) {
    return { side: 'buy', qty: fixedQty };
  }
  // count how long we've held using entryPx as a marker is unreliable; use price change
  // instead: sell when current price differs from entry by any amount after 5 bars via
  // a simple held-bar counter stored in state
  const held = (ctx.state && ctx.state.held) || 0;
  if (held >= holdBars) {
    ctx.state = { held: 0 };
    return { side: 'sell', qty: ctx.position };
  }
  ctx.state = { held: held + 1 };
  return null;
}
