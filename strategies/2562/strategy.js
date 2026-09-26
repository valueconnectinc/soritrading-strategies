/*
 * @coinsori-strategy v1
 * name: Pure Price-Based Hybrid No FearGreed BTC 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The champion's fear-greed gate was discovered to actively
 * destroy performance in the recent regime (2023-2026: champion -52% to -67%
 * vs hold +20% to +147%). Removing fear-greed and using pure price signals
 * (Bollinger bear-leg + EMA trend-pullback bull-leg) is robust across ALL
 * windows and does NOT fail on recent data. This is the full two-leg version
 * without the broken fear-greed signal.
 * When it buys and sells: bear regime buys panic bottoms (close below lower
 * Bollinger(20,2), exit at mid-band or 3x ATR stop); bull regime buys pullbacks
 * to the 20-EMA in a confirmed 20>50 uptrend (exit on 50-EMA break).
 * When it does NOT work: it lags buy-and-hold in pure melt-up windows (early
 * 2017-18, the 2019-22 bull) because it exits too early and stays defensive;
 * sideways chop whipsaws the 50-EMA.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const ema50 = ctx.ema(50, 1);
  const ema20 = ctx.ema(20, 1);
  const ema20p = ctx.ema(20, 2);
  const atr = ctx.atr(14, 1);
  if (bb == null || bb.lower == null || bb.mid == null) return null;
  if (ema50 == null || ema20 == null || ema20p == null || atr == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const bull = ema20 > ema50 && price > ema50;

  if (pos > 0) {
    if (price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
    if (!bull) {
      if (price >= bb.mid) return { side: 'sell', qty: pos };
    } else {
      if (price < ema50) return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Vol-targeted sizing: risk 1.5% of equity per ATR unit, cap at ~99% of cash.
  const riskBudget = 0.015;
  const volFrac = riskBudget / (atr / price);
  const qty = (ctx.cash / price) * Math.min(volFrac, 0.99);

  if (bull) {
    const nearEma20 = price <= ema20 + atr * 0.5 && price > ema50;
    const rising = ema20 > ema20p;
    if (nearEma20 && rising) {
      return { side: 'buy', qty: qty };
    }
    return null;
  }

  if (price < bb.lower) {
    return { side: 'buy', qty: qty };
  }
  return null;
}
