/*
 * @coinsori-strategy v1
 * name: Macro-Regime Band-Bounce BTC 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: A genuinely different family — a macro regime filter on
 * top of the validated band-bounce mean-reversion entry. A falling dollar
 * index (DXY) is the classic risk-on regime for crypto; a rising DXY is
 * risk-off. This tests whether adding the macro regime improves the champion
 * by only buying panic bottoms when the macro backdrop is supportive.
 * When it buys and sells: buys on the champion entry (lower Bollinger + RSI<30
 * above the 200-SMA) but ONLY when DXY is in a downtrend (risk-on); exits at
 * mid-band / RSI>50 or a 6-ATR stop. If DXY data is unavailable it falls back
 * to the unchampioned entry (no gate).
 * When it does NOT work: if DXY data is missing it silently trades like the
 * champion (no added value); if crypto decouples from the dollar the filter
 * can gate good entries for no reason. Macro data may have gaps.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  if (bb == null || rsi == null || sma200 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const atr = ctx.atr(14, 1);

  if (pos > 0) {
    if (price >= bb.mid || rsi > 50) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    if (atr != null && price <= ctx.entryPx - atr * 6) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const lastExit = ctx.state.lastExit || 0;
  if (ctx.i - lastExit < 5) return null;

  if (price < sma200) return null;

  // Macro regime gate: only buy when the dollar is falling (risk-on).
  // Rolling 30-bar DXY history; gate when the dollar is rising over it.
  const dxy = ctx.macro('dxy');
  if (dxy != null && dxy.value != null) {
    ctx.state.dxyHist = ctx.state.dxyHist || [];
    ctx.state.dxyHist.push(dxy.value);
    if (ctx.state.dxyHist.length > 30) ctx.state.dxyHist.shift();
    if (ctx.state.dxyHist.length === 30) {
      const dxyNow = dxy.value;
      const dxyPrev = ctx.state.dxyHist[0];
      if (dxyNow > dxyPrev) return null; // rising dollar = risk-off
    }
  }

  if (price < bb.lower && rsi < 30) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
