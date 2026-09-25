/*
 * @coinsori-strategy v1
 * name: BTC OnChain ConstantTest
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: diagnostic — tests whether ctx.data('addr') is a
 * time-varying series or a constant. If addr is constant, addr > avgPrior*0.5
 * is ALWAYS true (constant > half of itself), so this will trade; if addr is
 * time-varying it will trade roughly half as often. Distinguishes the two.
 * When it buys: price above 50-SMA and addr > 0.5 * prior-30-day average.
 * When it does NOT work: n/a — diagnostic.
 */
function onUpdate(ctx) {
  const sma50 = ctx.sma(50, 1);
  if (sma50 == null) return null;
  const addr = ctx.data('addr');
  if (addr == null) return null;
  const price = ctx.price;
  const pos = ctx.position;

  const st = ctx.state || {};
  const hist = st.addrHist || [];
  hist.push(addr);
  if (hist.length > 30) hist.shift();
  st.addrHist = hist;
  ctx.state = st;

  const prior = hist.slice(0, hist.length - 1);
  const avgPrior = prior.length ? prior.reduce((a, b) => a + b, 0) / prior.length : null;
  const cond = avgPrior != null && addr > avgPrior * 0.5;

  if (pos > 0) {
    if (price < sma50) return { side: 'sell', qty: pos };
    return null;
  }
  if (price > sma50 && cond) return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  return null;
}
