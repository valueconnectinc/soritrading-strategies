/*
 * @coinsori-strategy v1
 * name: RS-Momentum Rotation BTC-ETH-SOL 4H
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: A different family from mean-reversion and volatility
 * breakout — cross-sectional relative strength. Instead of betting on one
 * asset, hold whichever of BTC/ETH/SOL has the strongest recent momentum,
 * and sit in cash when none is in an uptrend. Crypto leaders rotate, so
 * riding the current strongest asset captures more upside than a fixed pick.
 * When it buys and sells: holds the symbol whose 30-bar momentum (change)
 * is highest among those above their 200-SMA; switches only when another
 * becomes clearly stronger (hysteresis to avoid flipping every bar); goes
 * to cash when no asset is above its 200-SMA.
 * When it does NOT work: in choppy regimes where momentum whipsaws and
 * leadership flips often, and when all three assets fall together (a broad
 * drawdown) so rotation cannot help.
 */
function onUpdate(ctx) {
  const mySym = ctx.sym;
  const syms = ctx.syms || ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];

  // momentum = 30-bar price change; only assets above their 200-SMA qualify
  const cand = {};
  for (const s of syms) {
    const m = ctx.market(s);
    if (!m) continue;
    const sma = m.sma ? m.sma(200, 1) : null;
    const mom = m.change ? m.change(30, 1) : null;
    const px = m.price != null ? m.price : null;
    if (sma == null || mom == null || px == null) continue;
    if (px > sma) cand[s] = mom;
  }

  const pos = ctx.position;
  const holding = pos > 0 ? mySym : null;

  // hysteresis: only switch when the leader's edge over the current hold is >2%
  const HYST = 0.02;
  let target = null;

  if (Object.keys(cand).length > 0) {
    if (holding && cand[holding] != null) {
      target = holding;
      for (const s of syms) {
        if (cand[s] == null || s === holding) continue;
        if (cand[s] > cand[holding] + HYST) { target = s; break; }
      }
    } else {
      for (const s of syms) {
        if (cand[s] == null) continue;
        if (target == null || cand[s] > cand[target]) target = s;
      }
    }
  }

  // fallback: this symbol's own 200-SMA trend if market lookup failed
  if (target == null && Object.keys(cand).length === 0) {
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
