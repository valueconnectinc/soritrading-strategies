/*
 * @coinsori-strategy v1
 * name: SOL Hysteresis + Tighter ATR Trail + Vol&Fear Sizing 1D
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated SOL champion (1-ATR hysteresis regime switch with
 * vol & fear-greed sizing) beats buy-and-hold but has a 63% drawdown. The deepest
 * losses come from slow grind-downs that the 4-ATR trailing stop only catches late.
 * This variant tightens the trailing stop to 3 ATR and adds a fast vol-spike exit so
 * we bail out of crash days sooner, cutting MDD while keeping most of the upside.
 * When it buys and sells: Buy when the last closed price is above the 50-day average,
 * sized down when volatility is high or the crowd is in extreme fear. Sell when price
 * closes 1 ATR below the average, drops 3 ATRs below it in one move, falls 3 ATRs off
 * its running high, or closes with a single-day move bigger than 2.5 ATRs (vol spike).
 * When it does NOT work: A tighter trail exits normal 20-30% SOL bull pullbacks that
 * instantly recover, so it lags buy-and-hold in straight-line melt-ups; and no sizing
 * rule fixes a slow steady decline that never makes a new high.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 55) return null;
  const px = closes[closes.length - 2]; // last CLOSED bar
  const pxPrev = closes[closes.length - 3];
  const sma50 = ctx.sma(50, 1);
  const atr = ctx.atr(14, 1);
  const pos = ctx.position;
  const cash = ctx.cash;
  const st = ctx.state;
  if (px == null || sma50 == null || atr == null || px <= 0) return null;

  const long = px > sma50;
  const exitBelow = px < sma50 - 1.0 * atr; // hysteresis: ignore small chop
  const crashStop = px < sma50 - 3.0 * atr;

  // Volatility-scaled sizing: normalized vol = ATR/price averaged over last 50 bars,
  // compared to today's ratio. More volatile than normal -> cut exposure, clamp [0.3,1].
  let ratioSum = 0, ratioCount = 0;
  for (let k = 1; k <= 50; k++) {
    const c = closes[closes.length - 1 - k];
    const a = ctx.atr(14, k);
    if (c != null && a != null && c > 0) { ratioSum += a / c; ratioCount++; }
  }
  let sizeMult = 1;
  if (ratioCount >= 20) {
    const normRatio = ratioSum / ratioCount;
    const currentRatio = atr / px;
    sizeMult = Math.max(0.3, Math.min(1, normRatio / currentRatio));
  }

  // Fear & greed risk filter: extreme fear (<=20) usually means mid-crash. Cut to 40%.
  const fg = ctx.data('fear_greed');
  if (fg != null && fg <= 20) {
    sizeMult *= 0.4;
  }

  if (pos === 0) {
    st.runHigh = null;
    if (long && cash > 0 && ctx.price > 0) {
      st.runHigh = px;
      return { side: 'buy', qty: (cash / ctx.price) * 0.98 * sizeMult };
    }
    return null;
  }

  if (st.runHigh == null) st.runHigh = px;
  st.runHigh = Math.max(st.runHigh, px);
  const trailHit = px < st.runHigh - 3.0 * atr; // tighter than 4 ATR to cut MDD

  // Vol-spike exit: a single-day move bigger than 2.5 ATRs while long is usually the
  // start of a crash. Bail out immediately instead of waiting for the trail to catch.
  const volSpike = pxPrev != null && atr > 0 && Math.abs(px - pxPrev) > 2.5 * atr && px < pxPrev;

  if (exitBelow || crashStop || trailHit || volSpike) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
