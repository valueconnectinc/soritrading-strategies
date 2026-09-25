/*
 * @coinsori-strategy v1
 * name: Champion + BearLeg TimeStop
 * ex: binance
 * syms: BTCUSDT, SOLUSDT, ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The regime-switch hybrid champion v2 (fear-depth sizing) is
 * confirmed optimal, but its weakest window (BTC W2) still has 40% MDD, driven by
 * drawn-out bear-leg positions that buy a panic bottom and keep falling for many bars
 * before finally reaching the mid-band exit. This variant keeps every entry and the
 * fear-depth sizing identical, and adds ONE new exit rule on the bear leg only: if a
 * position has been held N bars without reaching its mid-band exit, it is a knife that
 * is not bouncing — cut it and free the capital instead of riding it down. This is a
 * fundamentally different mechanism from the failed sentiment/ATR-trail exits (it is a
 * "give up on a non-bouncing knife" rule, not a "sell on recovery" rule).
 * When it buys and sells: identical to champion v2 — bear leg buys panic bottoms
 * (fear<40 + lower Bollinger break) scaled down by fear depth (fg<20 -> 70%, fg<10 ->
 * 50%), mid-band exit; bull leg buys pullbacks to the 20-EMA in a confirmed uptrend,
 * exit below the 50-EMA. Only addition: bear-leg positions held longer than N bars
 * without a mid-band exit are closed early.
 * When it does NOT work: same as champion — sideways chop whipsaws the 50-EMA, and a
 * V-reversal through the 50-EMA gives the trend leg no entry. The time-stop can also
 * hurt if a slow, grinding recovery (which takes many bars but is profitable) gets cut
 * before reaching the mid-band — the time-stop must be long enough not to sever
 * legitimate slow recoveries.
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
      // bear-leg exit: mid-band, OR time-stop — a knife not bouncing within 30 bars
      // (5 days of 4h) is cut. 30 chosen so slow but real recoveries still complete.
      const held = ctx.i - ctx.state.entryBar;
      if (price >= bb.mid || held >= 30) return { side: 'sell', qty: pos };
    } else {
      if (price < ema50) return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Volatility-targeted position size (unchanged from champion)
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

  // Bear leg: scale down as fear deepens (champion v2 tiers)
  if (fg < 10) qty = qty * 0.5;
  else if (fg < 20) qty = qty * 0.7;

  if (fg < 40 && price < bb.lower) {
    // record entry bar in state so the time-stop can count held bars
    ctx.state.entryBar = ctx.i;
    return { side: 'buy', qty: qty };
  }

  return null;
}
