/*
 * @coinsori-strategy v1
 * name: BTC On-Chain Dip 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: BTC's active-address count measures real network use. When the network is
 * growing (addresses above their 30-day average) the asset has fundamental support, so a
 * short-term price dip inside a long uptrend is a discount, not a breakdown. This is a
 * different signal source (on-chain fundamentals) than the price-only RSI2 champion.
 * When it buys and sells: Buys BTC when active addresses are above their 30-day average AND
 * price is below its 50-day average but still above its 200-day average (a dip within an
 * uptrend). Sells when price climbs back above the 20-day average, falls 2.5 ATR below the
 * highest close since entry, or after 30 days.
 * When it does NOT work: If network growth is a lagging echo of a topping market, the
 * "support" is false and dips keep dipping. During a long featureless bull with no dips it
 * rarely trades and lags buy-and-hold badly.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const addr = ctx.data('addr');
  const addrSma = ctx.data('addr_sma30');
  const sma200 = ctx.sma(200, 1);
  const sma50 = ctx.sma(50, 1);
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  if (!Number.isFinite(price) || price <= 0) return null;
  if (addr == null || addrSma == null || sma200 == null || sma50 == null || ema20 == null || atr == null) return null;

  const st = ctx.state;
  const pos = ctx.position;
  const networkGrowing = addr > addrSma;

  if (pos <= 0) {
    // Buy a dip (price below its 50-day average) only when the network is growing and the
    // 200-day trend is intact — fundamental support + not a bear market.
    if (networkGrowing && price < sma50 && price > sma200) {
      st.entryBar = ctx.i;
      st.entryPx = price;
      st.peak = price;
      ctx.watch([{ side: 'sell', price: price - 2.5 * atr, trigger: 'below', note: '2.5 ATR trail' }]);
      return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
    }
    return null;
  }

  if (price > st.peak) st.peak = price;
  const trail = st.peak - 2.5 * atr;
  const barsHeld = ctx.i - (st.entryBar || ctx.i);
  ctx.watch([{ side: 'sell', price: trail, trigger: 'below', note: '2.5 ATR trail' }]);
  // Exit on recovery above the 20-day average, the trailing stop, or a 30-day time limit.
  if (price > ema20 || price <= trail || barsHeld >= 30) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
