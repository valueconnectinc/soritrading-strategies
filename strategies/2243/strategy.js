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
 * When it buys and sells: hold the symbol above its 200-SMA with the higher
 * price/SMA strength; switch only when the other becomes clearly stronger
 * (hysteresis so it does not flip bar to bar); go to cash when neither is above.
 * When it does NOT work: when BTC and ETH are not correlated (one trends while
 * the other chops), and in long flat regimes where both oscillate around the SMA.
 */
function onUpdate(ctx) {
  const mySym = ctx.sym;
  const syms = ctx.syms || ['BTCUSDT', 'ETHUSDT'];

  const strength = {};
  for (const s of syms) {
    const m = ctx.market(s);
    if (!m) continue;
    const sma = m.sma ? m.sma(200, 1) : null;
    const px = m.price != null ? m.price : null;
    if (sma == null || px == null) continue;
    if (px > sma) strength[s] = px / sma;
  }

  // hysteresis: only switch when the gap in strength is meaningful (>3%)
  const HYST = 0.03;
  const pos = ctx.position;
  const holding = pos > 0 ? mySym : null;

  let target = null;
  if (Object.keys(strength).length > 0) {
    // current holding keeps its place unless another is clearly stronger
    if (holding && strength[holding] != null) {
      target = holding;
      for (const s of syms) {
        if (strength[s] == null || s === holding) continue;
        if (strength[s] > strength[holding] * (1 + HYST)) { target = s; break; }
      }
    } else {
      // not holding anything: take the strongest above-SMA candidate
      for (const s of syms) {
        if (strength[s] == null) continue;
        if (target == null || strength[s] > strength[target]) target = s;
      }
    }
  }

  // fall back to this symbol's own 200-SMA if market lookup failed
  if (target == null && Object.keys(strength).length === 0) {
    const sma = ctx.sma(200, 1);
    if (sma == null) return null;
    target = ctx.price > sma ? mySym : null;
  }

  const price = ctx.price;
  const cash = ctx.cash;

  if (target === mySym) {
    if (pos <= 0 && price > 0) {
      return { side: 'buy', qty: (cash / price) * 0.98 };
    }
    return null;
  } else {
    if (pos > 0) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
