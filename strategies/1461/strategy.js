/*
 * @coinsori-strategy v1
 * name: Multi-Timeframe EMA Trend Filter
 * ex: binanceusdm
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: SOL trends hard but whipsaws in ranges. A daily EMA50 filter
 * keeps us out of bear trends (where EMA crossover momentum failed, exp 353), while
 * the 4H EMA9/20 crossover catches the actual momentum swings. Volume confirmation
 * and RSI(40-70) avoid false breakouts.
 * When it buys and sells: Goes long when 4H EMA9 crosses above EMA20 AND daily EMA50
 * is rising (bullish regime). Exits on reverse cross, RSI>70 (overbought), or ATR stop.
 * When it does NOT work: In choppy markets with no clear trend the multiple timeframes
 * still produce whipsaws; flat daily EMA50 is the warning signal.
 */

function onUpdate(ctx) {
  // Daily EMA50: use ago=4 to read ~4 bars back = ~1 day of 4H data
  const emaD50_1 = ctx.ema(50, 4);
  const emaD50_2 = ctx.ema(50, 8); // 8 bars ago = ~2 days back
  if (emaD50_1 == null || emaD50_2 == null) return null;

  // Daily trend: EMA50 rising means current > 2-day-ago value
  const dailyBull = emaD50_1 > emaD50_2;
  if (!dailyBull) {
    // Bear or neutral regime — close if long, no new entries
    if (ctx.position > 0) {
      return { side: 'sell', qty: ctx.position };
    }
    return null;
  }

  // 4H EMAs
  const ema9_0  = ctx.ema(9, 0);
  const ema9_1  = ctx.ema(9, 1);
  const ema9_2  = ctx.ema(9, 2);
  const ema20_0 = ctx.ema(20, 0);
  const ema20_1 = ctx.ema(20, 1);
  const ema20_2 = ctx.ema(20, 2);
  if (ema9_0 == null || ema9_1 == null || ema9_2 == null ||
      ema20_0 == null || ema20_1 == null || ema20_2 == null) return null;

  // EMA9/20 crossover: ago=1 was below/equal, ago=0 is above
  const wasBearish = ema9_1 <= ema20_1;
  const nowBullish = ema9_0 > ema20_0;
  const bullCross = wasBearish && nowBullish;

  // RSI confirmation: 40–70 range avoids both oversold chasing and overbought entries
  const rsi = ctx.rsi(14, 1);
  if (rsi == null) return null;
  const rsiOk = rsi >= 40 && rsi <= 70;

  // Volume confirmation: today's volume > 4H average
  const avgVol = ctx.avgVol(12);
  if (avgVol == null || avgVol === 0) return null;
  const volRatio = ctx.vol / avgVol;
  const volOk = volRatio >= 1.0; // at least average volume

  // === ENTRY ===
  if (ctx.position === 0 && bullCross && rsiOk && volOk) {
    return {
      side: 'buy',
      qty: ctx.cash / ctx.price * 0.99,
      type: 'smart',
      postOnly: false
    };
  }

  // === EXIT signals ===
  if (ctx.position > 0) {
    // Reverse cross: EMA9 crosses below EMA20
    const wasBullish = ema9_1 > ema20_1;
    const nowBearish = ema9_0 <= ema20_0;
    const bearCross = wasBullish && nowBearish;

    // RSI overbought exit
    const rsiExit = rsi > 70;

    // ATR-based stop and target
    const atr = ctx.atr(14, 1);
    if (atr == null) return null;
    const atrStop  = ctx.entryPx - 2.0 * atr;
    const atrTarg  = ctx.entryPx + 3.0 * atr;
    const hitStop  = ctx.price < atrStop;
    const hitTarg  = ctx.price > atrTarg;

    if (bearCross || rsiExit || hitStop || hitTarg) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
