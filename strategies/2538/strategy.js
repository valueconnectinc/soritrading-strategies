/*
 * @coinsori-strategy v1
 * name: Champion + FedHikeGate BearLeg
 * ex: binance
 * syms: BTCUSDT, SOLUSDT, ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The confirmed champion v2 (fear-depth contrarian) is optimal, but
 * its weakest window (BTC W2) still shows 40% MDD from bear-leg panic-bottom buys that
 * keep falling. The three failed attempts attacked exits/sizing. This attacks the ENTRY
 * with a different mechanism: a macro fed-funds regime gate. When the Fed is hiking
 * (rate rising), liquidity drains from risk assets and crypto panic bottoms tend to keep
 * falling — so we simply do NOT buy bear-leg bottoms while the Fed is in a hiking regime.
 * When it buys and sells: identical to champion v2 — bear leg buys panic bottoms
 * (fg<40 + lower Bollinger break) scaled by fear depth, mid-band exit; bull leg buys
 * pullbacks to the 20-EMA in a confirmed uptrend, exit below the 50-EMA; 3x ATR hard
 * stop. The ONLY change: if the fed funds rate is currently rising (hiking regime), the
 * bear leg is disabled entirely.
 * When it does NOT work: if the fed-rate series is too flat/noisy in the backtest
 * window the gate may never trigger (no effect), or it may wrongly suppress bear-leg
 * buys during a Fed-pause that is actually a bottom. Also the bull leg is unaffected,
 * so a hiking-driven crash that the bull leg enters late is still not protected.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const ema50 = ctx.ema(50, 1);
  const ema20 = ctx.ema(20, 1);
  const ema20p = ctx.ema(20, 2);
  const atr = ctx.atr(14, 1);
  const fg = ctx.data('fg');
  const fed = ctx.data('fed');
  if (bb == null || bb.lower == null || bb.mid == null) return null;
  if (ema50 == null || ema20 == null || ema20p == null || atr == null) return null;
  if (fg == null) return null;

  // Track the fed-rate direction. Store the last fed value; rising = hiking regime.
  // fed is a slow monthly series, so compare against a stored reference updated over
  // a long horizon (every bar is fine since rate changes rarely).
  const prevFed = ctx.state.fed !== undefined ? ctx.state.fed : fed;
  const hiking = fed != null && fed > prevFed + 1e-6;
  ctx.state.fed = fed;

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

  // Bear leg: disabled entirely while the Fed is hiking (rate rising).
  // Hypothesis: liquidity drain means panic bottoms keep falling, so skip them.
  if (hiking) return null;

  if (fg < 10) qty = qty * 0.5;
  else if (fg < 20) qty = qty * 0.7;

  if (fg < 40 && price < bb.lower) {
    return { side: 'buy', qty: qty };
  }

  return null;
}
