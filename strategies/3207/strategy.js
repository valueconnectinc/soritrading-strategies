/*
 * @coinsori-strategy v1
 * name: 1D Multi-Asset Momentum Chandelier Stop
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the champion momentum core (90d ROC + 200-SMA + Fed
 * not-hiking) is validated, but its exit is slow — it holds until 90d
 * momentum fades or price breaks the 200-day, giving back big chunks of
 * gains in sharp drops (COVID 2020, the 2021 top). This version replaces
 * that exit with a volatility trailing stop (chandelier): exit when price
 * closes below the highest close of the last 22 days minus 4 ATRs. It locks
 * in gains much earlier in crashes while still riding normal bull pullbacks.
 * When it buys and sells: buy BTC/ETH/SOL when 90d momentum is above +20%,
 * price is above the 200-day average, and the Fed is not hiking. Sell when
 * price closes below the chandelier stop (22d high - 4 ATR) or below the
 * 200-day average.
 * When it does NOT work: in a slow grind-up with frequent 8-12% dips the
 * trailing stop whipsaws in and out, paying fees and missing the eventual
 * breakout; and it still cannot help a Fed-easing bear (late 2018).
 */
function onUpdate(ctx) {
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  const closes = ctx.closes;
  if (closes.length < 91) return null;
  const prevClose = closes[closes.length - 2];
  const base = closes[closes.length - 91];
  if (base == null || base <= 0) return null;
  const roc90 = (prevClose / base - 1) * 100;

  const atr = ctx.atr(14, 1);
  if (atr == null) return null;

  // 22-day highest close (closed bars only) for the chandelier stop.
  // 4 ATRs = roughly a 8-12% trail on BTC 1D: wide enough to survive normal
  // bull dips, tight enough to cut a crash early (champion exited too late).
  let hi = -Infinity;
  for (let k = 2; k <= 23; k++) {
    const c = closes[closes.length - k];
    if (c != null && c > hi) hi = c;
  }
  const chandelier = hi - 4 * atr;

  // Hiking = rate now is higher than 30 days ago. Missing Fed data => not
  // hiking so the strategy still trades (baseline behaviour).
  const fedNow = ctx.data('macro_fed_funds');
  const fedLag = ctx.data('fed_lag30');
  const hiking = (fedNow != null && fedLag != null) ? (fedNow > fedLag) : false;

  const pos = ctx.pos(ctx.sym);

  if (pos > 0 && (prevClose < chandelier || prevClose < sma200)) {
    return { side: 'sell', qty: pos };
  }
  if (pos === 0 && roc90 > 20 && prevClose > sma200 && !hiking) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.33 };
  }
  return null;
}
