/*
 * @coinsori-strategy v1
 * name: BTC On-Chain Network Regime
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * DEBUG ONLY — diagnostic via trade count.
 */

function onUpdate(ctx) {
  const addr = ctx.data('addr');
  const price = ctx.price;
  const st = ctx.state;
  st.prev = st.prev === undefined ? null : st.prev;
  st.varied = st.varied || false;
  if (addr != null && st.prev != null && addr !== st.prev) st.varied = true;

  if (ctx.i === 100) return { side: 'buy', qty: ctx.cash / price * 0.9 };
  if (ctx.i === 200 && st.varied) return { side: 'sell', qty: ctx.position };

  st.prev = addr;
  return null;
}
