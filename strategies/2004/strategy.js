/*
 * @coinsori-strategy v1
 * name: ATR Regime Adaptive — ETHUSDT
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The ATR regime-switching approach with volume confirmation
 * (strategy 2004) is the best result in this job on AVAXUSDT (+8.4/+3.6/-14.4%
 * across 3 walk-forward windows, all beating benchmark). This tests whether the
 * same signal family transfers to ETHUSDT 4H.
 * When it buys and sells: Low ATR% → momentum (EMA cross + RSI). High ATR% →
 * mean reversion (RSI + Bollinger Bands). ATR scales position size. Volume
 * confirmation on momentum entries.
 * When it does NOT work: ETH may have different volatility regimes than AVAX —
 * the 4% ATR threshold may need retuning for this asset.
 */
function onUpdate(ctx) {
  const s = ctx.state;

  if (s.lastBarI !== ctx.i) {
    s.prev = s.snap || {};
    s.lastBarI = ctx.i;
  }

  const atr    = ctx.atr(14);
  const sma20  = ctx.sma(20);
  const ema9   = ctx.ema(9);
  const ema21  = ctx.ema(21);
  const rsi    = ctx.rsi(14);
  const bb     = ctx.bb(20, 2);
  const vol    = ctx.avgVol(20);

  if (!atr || !sma20 || !ema9 || !ema21 || !rsi || !bb || !vol) return null;

  s.snap = { ema9, ema21, rsi };

  const prev = s.prev;
  const prevEma9  = prev.ema9;
  const prevEma21 = prev.ema21;

  const atrPct    = (atr / ctx.price) * 100;
  const isHighVol = atrPct > 4.0;

  const atrRisk = Math.min(atrPct / 4.0, 1.0);
  const posFrac  = 0.99 * (1.0 - atrRisk * 0.5);

  const volOk = ctx.vol > vol * 0.8;

  let buySignal  = false;
  let sellSignal = false;

  if (!isHighVol) {
    if (prevEma9 && prevEma21) {
      const crossUp    = prevEma9 <= prevEma21 && ema9 > ema21;
      const rsiConfirm = rsi > 50 && rsi < 75;
      const aboveSma   = ctx.price > sma20;
      buySignal = crossUp && rsiConfirm && aboveSma && volOk;
    }
    if (prevEma9 && prevEma21) {
      const crossDown = prevEma9 >= prevEma21 && ema9 < ema21;
      const rsiOverb  = rsi > 75;
      sellSignal = crossDown || rsiOverb;
    }
  } else {
    if (rsi < 35 && ctx.price < bb.lower) {
      buySignal = true;
    }
    if (rsi > 65 || (bb.middle && ctx.price >= bb.middle)) {
      sellSignal = true;
    }
  }

  if (!ctx.position) {
    if (buySignal) {
      const qty = (ctx.cash * posFrac) / ctx.price;
      return { side: 'buy', qty };
    }
  } else {
    if (sellSignal) {
      return { side: 'sell', qty: ctx.position };
    }
    const slPx = ctx.entryPx * (1 - 2.5 * atrPct / 100);
    if (ctx.price < slPx) {
      return { side: 'sell', qty: ctx.position };
    }
    const tpRsi = isHighVol ? 65 : 80;
    if (rsi > tpRsi) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
