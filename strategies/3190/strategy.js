/*
 * @coinsori-strategy v1
 * name: BTC 4H Macro-Gated Trend
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: crypto rallies happen when the US dollar weakens (risk-on) and price
 * trend is up. Filtering longs by a falling DXY avoids buying into USD-strength bear regimes,
 * which is exactly where unfiltered breakouts get chopped up (as seen in 2024-26).
 * When it buys and sells: Buy when price is above its 50-EMA, the 50-EMA is above the 200-EMA,
 * and DXY is below its own recent average. Sell when price drops back below the 50-EMA or the
 * 50/200 alignment breaks.
 * When it does NOT work: In a strong risk-on rally where DXY is also rising (liquidity-driven
 * melt-up), the DXY gate keeps us out and we miss gains. Also in flat chop with no trend the
 * EMA cross whipsaws.
 */
function onUpdate(ctx) {
  const ema50 = ctx.ema(50, 1);
  const ema200 = ctx.ema(200, 1);
  if (ema50 == null || ema200 == null) return null;
  const closes = ctx.closes;
  if (closes.length < 2) return null;
  const prevClose = closes[closes.length - 2];

  // --- DXY regime buffer (macro gate) ---
  const st = ctx.state;
  if (!st.dxyHist) st.dxyHist = [];
  const dxyNow = ctx.macro('dxy');
  if (dxyNow != null) {
    st.dxyHist.push(dxyNow);
    if (st.dxyHist.length > 100) st.dxyHist.shift();
  }
  // Gate active only once we have 20 DXY readings; risk-on = DXY below its own average
  let riskOn = true;
  if (st.dxyHist.length >= 20) {
    let sum = 0;
    for (let i = 0; i < st.dxyHist.length; i++) sum += st.dxyHist[i];
    const avg = sum / st.dxyHist.length;
    riskOn = dxyNow != null && dxyNow < avg * 1.005; // 0.5% tolerance avoids noise flips
  }

  const uptrend = prevClose > ema50 && ema50 > ema200;

  if (ctx.position > 0 && (prevClose < ema50 || ema50 < ema200)) {
    return { side: 'sell', qty: ctx.position };
  }
  if (ctx.position === 0 && uptrend && riskOn) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
