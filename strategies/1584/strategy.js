/*
 * @coinsori-strategy v1
 * name: RSI Mean Reversion + Vol Spike MATIC
 * ex: binance
 * syms: MATICUSDT
 * interval: 4h
 * cash: 1000
 *
 * Classic mean reversion on MATIC: buys when RSI drops below 30 (oversold) AND
 * volume surges above 1.5x its 20-bar average — a confirmed oversold bounce setup.
 * Sells when RSI rises above 60 or price hits a 5% trailing stop from the entry high.
 * Bets on the bounce back to mean after panic selling.
 * Works when MATIC bounces after sharp corrections with volume participation.
 * Fails in prolonged downtrends where RSI stays low and bounces fizzle.
 */
function onUpdate(ctx) {
  const rsiLen = 14;
  const volLen = 20;
  const rsiOB = 30;    // oversold threshold for buy
  const rsiSell = 60;  // overbought / mean for sell
  const volMult = 1.5; // volume must be this multiple of avg to confirm
  const trailPct = 0.05; // 5% trailing stop from session high

  const rsi = ctx.rsi(rsiLen);
  const avgVol = ctx.avgVol(volLen);
  if (rsi == null || avgVol == null || avgVol === 0) return null;

  const volSpike = ctx.vol >= avgVol * volMult;
  const hasPos = ctx.position > 0;

  if (!hasPos) {
    // Buy when oversold + volume confirmation
    if (rsi < rsiOB && volSpike) {
      ctx.state.entryPrice = ctx.price;
      ctx.state.sessionHigh = ctx.price;
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    return null;
  }

  // Track session high after entry
  if (ctx.price > ctx.state.sessionHigh) {
    ctx.state.sessionHigh = ctx.price;
  }

  // Trailing stop
  const trailPrice = ctx.state.sessionHigh * (1 - trailPct);
  const hitTrail = ctx.price <= trailPrice;

  // Sell: RSI mean reversion complete or trailing stop hit
  if (rsi > rsiSell || hitTrail) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
