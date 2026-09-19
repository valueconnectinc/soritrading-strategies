/*
 * @coinsori-strategy v1
 * name: BB Squeeze Breakout MATIC
 * ex: binance
 * syms: MATICUSDT
 * interval: 4h
 * cash: 1000
 *
 * Catches volatility breakouts after low-bandwidth "squeeze" periods.
 * Buys when Bollinger bandwidth drops to a low percentile of recent history,
 * then price closes above the upper band — the squeeze releases.
 * Exits on RSI overbought (>=70) or trailing ATR stop.
 * Works best in trending crypto markets with alternating calm/volatility.
 * Fails in choppy, range-bound conditions with no follow-through after squeeze.
 */
function onUpdate(ctx) {
  const lookback = 100; // lookback for bandwidth percentile
  const atrLen = 14;
  const bbLen = 20;
  const k = 2;
  const rsiLen = 14;
  const rsiOB = 70;   // sell when RSI hits this
  const rsiOB2 = 65;  // sell when RSI drops below this after being overbought
  const squeezePct = 20; // bottom percentile for squeeze entry
  const trailMult = 1.5; // ATR multiplier for trailing stop

  // Indicators
  const bb = ctx.bb(bbLen, k);
  const atr = ctx.atr(atrLen);
  const rsi = ctx.rsi(rsiLen);
  if (bb == null || bb.width == null || atr == null || rsi == null) return null;

  // Track bandwidth history manually for squeeze detection
  // We store last 100 bandwidth values in state
  if (ctx.state.bwHistory == null) ctx.state.bwHistory = [];
  const hist = ctx.state.bwHistory;
  hist.push(bb.width);
  if (hist.length > lookback) hist.shift();

  if (hist.length < lookback) return null; // need enough history

  // Sort to find percentile
  const sorted = [...hist].sort((a, b) => a - b);
  const idx = Math.floor((squeezePct / 100) * sorted.length);
  const threshold = sorted[idx];

  const isSqueezed = bb.width <= threshold;
  const priceAboveUpper = ctx.price >= bb.upper;

  // Entry: squeeze firing — bandwidth just crossed above threshold (was below)
  const wasSqueezed = hist.length >= 2 && hist[hist.length - 2] <= threshold;
  const squeezeFiring = isSqueezed && wasSqueezed && priceAboveUpper;

  // Position management
  const hasPos = ctx.position > 0;

  if (!hasPos) {
    if (squeezeFiring) {
      ctx.state.entryPrice = ctx.price;
      ctx.state.entryBar = ctx.i;
      ctx.state.highestAfterEntry = ctx.price;
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    return null;
  }

  // Track highest after entry
  if (ctx.price > ctx.state.highestAfterEntry) {
    ctx.state.highestAfterEntry = ctx.price;
  }

  // Trailing ATR stop
  const trailPrice = ctx.state.highestAfterEntry - trailMult * atr;
  const hitTrail = ctx.price <= trailPrice;

  // Sell conditions
  const hitRSIExit = rsi >= rsiOB;
  // RSI cooling: was overbought and now dropped below OB2
  const rsiCooling = ctx.state.wasOB && rsi < rsiOB2;
  ctx.state.wasOB = rsi >= rsiOB;

  if (hitTrail || hitRSIExit || rsiCooling) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
