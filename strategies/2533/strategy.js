/*
 * @coinsori-strategy v1
 * name: Regime-Switch Hybrid VolTargeted + FearDepthSizing + SentimentExit
 * ex: binance
 * syms: BTCUSDT, SOLUSDT, ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The champion v2 (fear-depth sizing) beats buy-and-hold on all BTC
 * 4h windows. This variant tests ONE change: the bear leg currently exits when price
 * climbs back to the mid Bollinger band. Here it instead exits when the fear-greed
 * index recovers above 50 — i.e. it sells when the panic has dissipated, completing
 * the contrarian loop (buy fear, sell when fear is gone) regardless of how far price
 * has bounced. The hope: capture more of sharp V-recoveries (which blow straight
 * through the mid-band) and cut losses in slow grind-ups where price never reaches
 * mid-band but fear normalizes.
 * When it buys and sells: identical to champion — bear leg buys panic bottoms (fg<40 +
 * lower Bollinger break); bull leg buys 20-EMA pullbacks in uptrend (50-EMA exit).
 * Only the bear-leg EXIT differs: fg>50 instead of price>=mid-band.
 * When it does NOT work: if a window's best bear-leg gains come from holding a panic
 * bottom all the way to mid-band while fg stays below 50 for a long time, the
 * sentiment exit sells too early and leaves profit on the table.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const ema50 = ctx.ema(50, 1);
  const ema20 = ctx.ema(20, 1);
  const ema20p = ctx.ema(20, 2);
  const atr = ctx.atr(14, 1);
  const fg = ctx.data('fg');
  if (bb == null || bb.lower == null || bb.mid == null) return null;
  if (ema50 == null || ema20 == null || ema20p == null || atr == null) return null;
  if (fg == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const bull = ema20 > ema50 && price > ema50;

  if (pos > 0) {
    // hard stop: 3x ATR from entry (unchanged from champion)
    if (price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
    if (!bull) {
      // sentiment exit: sell the bear leg once fear has dissipated (fg>50)
      if (fg > 50) return { side: 'sell', qty: pos };
    } else {
      if (price < ema50) return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Volatility-targeted position size (unchanged from champion): a 1-ATR adverse move
  // should cost ~1.5% of equity.
  const riskBudget = 0.015;
  const volFrac = riskBudget / (atr / price);
  let qty = (ctx.cash / price) * Math.min(volFrac, 0.99);

  if (bull) {
    const nearEma20 = price <= ema20 + atr * 0.5 && price > ema50;
    const rising = ema20 > ema20p;
    if (nearEma20 && rising) {
      return { side: 'buy', qty: qty };
    }
    return null;
  }

  // Bear leg: scale down as fear deepens. fg<20 (falling knife) -> 70%; fg<10 -> 50%.
  if (fg < 10) qty = qty * 0.5;
  else if (fg < 20) qty = qty * 0.7;

  if (fg < 40 && price < bb.lower) {
    return { side: 'buy', qty: qty };
  }

  return null;
}
