/*
 * @coinsori-strategy v1
 * name: BTC 1D Addr Log Diag
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: DIAGNOSTIC — logs the active-address ratio vs its 30-day
 *   baseline to see why the surge filter never fires.
 * When it buys and sells: Logs ratio every bar; buys on any addr>0 to confirm.
 * When it does NOT work: Not a real strategy.
 */
function onUpdate(ctx) {
  const addr = ctx.data('addr');
  const s = ctx.state;
  if (s.lastBarI !== ctx.i) {
    s.hist = s.hist || [];
    if (addr != null) s.hist.push(addr);
    if (s.hist.length > 31) s.hist.shift();
    s.lastBarI = ctx.i;
  }
  if (s.hist.length >= 31 && addr != null) {
    const cur = s.hist[s.hist.length - 1];
    let sum = 0;
    for (let i = 0; i < s.hist.length - 1; i++) sum += s.hist[i];
    const avg30 = sum / (s.hist.length - 1);
    const ratio = cur / avg30;
    if (ctx.i % 100 === 0) ctx.log('i=' + ctx.i + ' addr=' + addr + ' cur=' + cur + ' avg30=' + avg30.toFixed(0) + ' ratio=' + ratio.toFixed(3));
  }
  const price = ctx.price;
  const sma200 = ctx.sma(200, 1);
  if (addr == null || sma200 == null) return null;
  const pos = ctx.position;
  if (pos > 0) {
    const atr = ctx.atr(14, 1);
    if (atr == null) return null;
    if (s.highest == null || price > s.highest) s.highest = price;
    if (price < s.highest - 3 * atr) return { side: 'sell', qty: pos };
    return null;
  }
  if (addr > 0 && price > sma200) {
    s.highest = price;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
