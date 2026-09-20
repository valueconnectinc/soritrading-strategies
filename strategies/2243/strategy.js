/*
 * @coinsori-strategy v1
 * name: BTC-ETH 200SMA Rotation
 * ex: binance
 * syms: BTCUSDT, ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The single-asset 200-SMA trend ride is our confirmed edge
 * on both BTC and ETH. Instead of betting on one asset, rotate into whichever
 * of the two is above its 200-SMA with the stronger trend, else sit in cash.
 * This is a different family (multi-asset allocation) that builds on the same
 * robust slow-trend signal and aims to cut single-asset drawdown.
 * When it buys and sells: hold the symbol that is above its 200-SMA and has the
 * higher price/SMA strength; switch to the other when it becomes stronger; go to
 * cash when neither is above its 200-SMA.
 * When it does NOT work: when BTC and ETH are not correlated (one trends while
 * the other chops), and in long flat regimes where both oscillate around the SMA.
 */
function onUpdate(ctx) {
  const mySym = ctx.sym;
  const syms = ctx.syms || ['BTCUSDT', 'ETHUSDT'];

  // strength = how far above its 200-SMA each symbol trades; only above-SMA counts
  const strength = {};
  for (const s of syms) {
    const m = ctx.market(s);
    if (!m) continue;
    const sma = m.sma ? m.sma(200, 1) : null;
    const px = m.price != null ? m.price : null;
    if (sma == null || px == null) continue;
    if (px > sma) strength[s] = px / sma; // only trending-up assets are candidates
  }

  // pick the single strongest candidate above its SMA (fall back to my own SMA if market lookup missing)
  let target = null;
  if (Object.keys(strength).length > 0) {
    for (const s of syms) {
      if (strength[s] == null) continue;
      if (target == null || strength[s] > strength[target]) target = s;
    }
  }

  // if no market data resolved, fall back to this symbol's own 200-SMA
  if (target == null) {
    const sma = ctx.sma(200, 1);
    if (sma == null) return null;
    target = ctx.price > sma ? mySym : null;
  }

  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;

  if (target === mySym) {
    // we should be long this symbol
    if (pos <= 0 && price > 0) {
      return { side: 'buy', qty: (cash / price) * 0.98 };
    }
    return null;
  } else {
    // we should NOT hold this symbol (another is stronger, or cash)
    if (pos > 0) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
