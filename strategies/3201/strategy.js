/*
 * @coinsori-strategy v1
 * name: BTC 1D Momentum Hysteresis + On-Chain Regime Gate
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the validated 90-day momentum hysteresis makes most of its
 * money in long trends but its documented weakness is late exits in sharp
 * V-reversals. Both smoothed active addresses and hashrate rising = healthy
 * network demand; requiring this regime gate on entries avoids buying into a
 * reversal when on-chain demand is already contracting.
 * When it buys and sells: Buys only when BOTH the 90-day price momentum is
 * strong (above +20%) AND price is above its 200-day average AND on-chain
 * demand (addr and hashrate, 30-day smoothed) is rising vs 30 days ago.
 * Sells when momentum fades (90-day change below +5%), price breaks the
 * 200-day average, OR the on-chain regime turns off.
 * When it does NOT work: on-chain demand lags price recoveries, so it misses
 * the first leg of a new bull market; in a melt-up with flat addresses it
 * stays out. In a fast V-reversal the momentum exit still dominates.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  // Price momentum (base champion #3192): 90-day ROC + 200-day trend gate.
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  const closes = ctx.closes;
  if (closes.length < 91) return null;
  const prevClose = closes[closes.length - 2];
  const base = closes[closes.length - 91];
  if (base == null || base <= 0) return null;
  const roc90 = (prevClose / base - 1) * 100;

  // On-chain regime: BOTH smoothed addr and hashrate rising vs 30 bars ago.
  const addr = Number(ctx.data('addr_sma30'));
  const hash = Number(ctx.data('hashrate_sma30'));
  if (!Number.isFinite(addr) || addr <= 0 || !Number.isFinite(hash) || hash <= 0) return null;

  // Continuous rolling buffer — never reset between trades.
  const hist = ctx.state.ochist || [];
  hist.push([addr, hash]);
  if (hist.length > 30) hist.shift();
  ctx.state.ochist = hist;
  if (hist.length < 30) return null;
  const [oldAddr, oldHash] = hist[0];
  const regUp = addr > oldAddr * 1.003 && hash > oldHash * 1.003; // 0.3% hysteresis

  // Exit: momentum faded, trend broke, OR on-chain regime turned off.
  if (pos > 0 && (roc90 < 5 || prevClose < sma200 || !regUp)) {
    return { side: 'sell', qty: pos };
  }
  // Entry: price momentum AND on-chain regime must agree.
  if (pos === 0 && roc90 > 20 && prevClose > sma200 && regUp) {
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }
  return null;
}
