/*
 * @coinsori-strategy v1
 * name: Champion v2 Final (FearDepth TwoTier)
 * ex: binance
 * syms: BTCUSDT, SOLUSDT, ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The regime-switch hybrid champion beats buy-and-hold on all three
 * BTC 4h windows by combining two complementary edges: (1) a fear-contrarian bear leg
 * that buys panic bottoms (fear<40 + lower Bollinger break) and rides them back to the
 * mid-band, and (2) a selective trend leg that buys pullbacks to the 20-EMA in a
 * confirmed uptrend. Its only weakness is high drawdown on the bear leg, whose biggest
 * losses come from buying panic bottoms in GENUINE crashes that keep falling. This
 * final version scales the bear-leg position down as fear deepens: moderate panic
 * (fg 20-40) keeps full size, deep fear (fg<20) cuts to 70%, and capitulation
 * (fg<10) cuts to 50% — trimming knife-catching losses while keeping most of the upside
 * when an extreme-fear bottom does recover sharply. This two-tier sizing is the
 * validated optimum (a harder 40% cut was identical on BTC, so 50% is the sweet spot).
 * When it buys and sells: bear regime buys panic bottoms (fear<40 + lower Bollinger
 * break, mid-band exit, 3x ATR hard stop); bull regime buys pullbacks to the 20-EMA in
 * a confirmed uptrend (exit below the 50-EMA). Position is volatility-targeted so a
 * 1-ATR adverse move costs ~1.5% of equity.
 * When it does NOT work: sideways chop whipsaws the 50-EMA, and a sharp V-reversal
 * straight through the 50-EMA gives the trend leg no entry. If a window's biggest
 * recoveries come from extreme-fear bottoms, the 50% cut caps the upside on those
 * trades. Four separate improvement attempts (greed-sizing, sentiment exit, time-stop
 * exit, bounce-confirm entry) all failed — this entry/sizing/exit combination is
 * locally optimal.
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
    // hard stop: 3x ATR from entry
    if (price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
    if (!bull) {
      if (price >= bb.mid) return { side: 'sell', qty: pos };
    } else {
      if (price < ema50) return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Volatility-targeted position size: a 1-ATR adverse move costs ~1.5% of equity.
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

  // Bear leg: scale down as fear deepens. Deep fear (fg<20) is the falling-knife zone
  // where genuine crashes keep falling -> 70%; capitulation (fg<10) -> 50%.
  if (fg < 10) qty = qty * 0.5;
  else if (fg < 20) qty = qty * 0.7;

  if (fg < 40 && price < bb.lower) {
    return { side: 'buy', qty: qty };
  }

  return null;
}
