/*
 * @coinsori-strategy v1
 * name: On-Chain Demand + Vol-Scaled Size BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: On-chain active-address demand (30-day smoothed) is a
 * validated defensive trend signal — it rises in healthy bulls and leads price
 * in capitulation, so it loses less in bears than holding. Its known weakness is
 * high drawdown in the sharpest reversals (demand lags price). This version keeps
 * the pure demand signal but adds GENTLE volatility-scaled sizing: full position
 * in normal volatility, scaled down only in extreme ATR stress (never below half).
 * Sizing is a lever not yet tried on this family — it should trim the tail
 * drawdown without cutting off the demand trend early.
 * When it buys and sells: holds Bitcoin while 30-day-smoothed active addresses
 * are rising vs ~30 days earlier; sells to cash when they turn down. Position
 * size is scaled down linearly when ATR exceeds 6% of price, never below half.
 * When it does NOT work: on-chain data is daily and lags price, so in a sharp
 * V-shaped melt-up it re-enters late and trails buy-and-hold; and the demand
 * signal can stay high for a while after price tops (drawdown remains in the
 * first leg of a crash).
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const addr = Number(ctx.data('addr_sma30'));
  if (!Number.isFinite(addr) || addr <= 0) return null;

  const st = ctx.state;
  if (!st.aHist) st.aHist = [];
  st.aHist.push(addr);
  if (st.aHist.length > 30) st.aHist.shift();
  if (st.aHist.length < 30) return null;
  const aPast = st.aHist[0];

  const rising = addr > aPast * 1.01;
  const falling = addr < aPast * 0.99;

  // GENTLE volatility-target sizing: full size up to 6% ATR; scale linearly to
  // 50% size at 12% ATR. Only extreme stress cuts exposure, never below half.
  const atr = ctx.atr(14, 1);
  let sizeFrac = 1.0;
  if (atr != null && Number.isFinite(atr) && atr > 0) {
    const atrPct = atr / price;
    if (atrPct > 0.06) {
      sizeFrac = Math.max(0.5, 1.0 - (atrPct - 0.06) / 0.06);
    }
  }

  if (pos > 0) {
    if (falling) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (rising) {
    return { side: 'buy', qty: ctx.cash / price * 0.95 * sizeFrac };
  }
  return null;
}
