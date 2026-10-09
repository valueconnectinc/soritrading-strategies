/*
 * @coinsori-strategy v1
 * name: Macro-Regime Trend BTC 1D
 * ex: binance
 * syms: BTC
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin behaves like a risk asset — it tends to rally when the
 * dollar weakens and stall when the dollar strengthens. We hold BTC only while both
 * the price trend and the macro regime (DXY) are favorable.
 * When it buys and sells: Buys when BTC closes above its 200-day average while the
 * Dollar Index sits below its own 50-day average (risk-on). Sells when BTC closes
 * back below its 200-day average or DXY rises above its 50-day average (risk-off).
 * When it does NOT work: In choppy, no-trend markets the 200-day filter whipsaws.
 * It also misses the first leg of a rally that starts while DXY is still elevated.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const ema200 = ctx.ema(200, 1);       // closed-bar 200-day trend
  const dxyRaw = ctx.macro('dxy');       // Dollar Index value
  if (ema200 == null || dxyRaw == null) {
    if (ctx.i % 50 === 0) ctx.log('guard null i=' + ctx.i + ' ema=' + ema200 + ' dxyRaw=' + JSON.stringify(dxyRaw));
    return null;
  }
  const dxy = typeof dxyRaw === 'number' ? dxyRaw : (dxyRaw.value != null ? dxyRaw.value : NaN);
  if (isNaN(dxy)) {
    if (ctx.i % 50 === 0) ctx.log('dxy not a number: ' + JSON.stringify(dxyRaw));
    return null;
  }

  // Rolling history of DXY closes so we can compute its own 50-bar average.
  const hist = ctx.state.dxyHist || [];
  hist.push(dxy);
  while (hist.length > 60) hist.shift();
  ctx.state.dxyHist = hist;
  if (ctx.i % 50 === 0) ctx.log('i=' + ctx.i + ' dxy=' + dxy.toFixed(2) + ' histLen=' + hist.length + ' pos=' + ctx.position);
  if (hist.length < 50) return null;
  const dxyAvg = hist.slice(-50).reduce((a, b) => a + b, 0) / 50;

  const pos = ctx.position;
  const riskOn = dxy < dxyAvg;           // DXY below its own average = risk-on for crypto

  if (pos === 0) {
    ctx.watch([{ side: 'buy', price: ema200, trigger: 'above', note: '200d trend up',
                 conds: [{ label: 'DXY below 50d avg', ok: riskOn }] }]);
    if (price > ema200 && riskOn) {
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
    return null;
  }

  const prevClose = ctx.closes.at(-2);
  ctx.watch([{ side: 'sell', price: ema200, trigger: 'below', note: '200d trend fail',
               conds: [{ label: 'DXY risk-off', ok: !riskOn }] }]);
  if (prevClose != null && prevClose < ema200) return { side: 'sell', qty: pos };
  if (!riskOn) return { side: 'sell', qty: pos };
  return null;
}
