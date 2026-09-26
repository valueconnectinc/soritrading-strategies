/*
 * @coinsori-strategy v1
 * name: Onchain Demand + Trend BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Combines two independent signals — on-chain network demand
 * (30-day-smoothed active addresses) and price trend (200-SMA). Bet: the best
 * BTC entries are when network demand is expanding AND price is above its
 * long-term trend; demand contraction or a broken trend = step aside. The price
 * gate should cut the deep drawdowns the pure on-chain strategy took in bear
 * windows while keeping the demand confirmation.
 * When it buys and sells: holds BTC when smoothed demand is rising and price is
 * above a rising 200-SMA; sells when demand turns down or price breaks the SMA.
 * When it does NOT work: still lags pure buy-and-hold in melt-ups (demand lags
 * price), and in a choppy range where demand and trend disagree it sits flat.
 * On-chain data is live in the feed (verified).
 */
function onUpdate(ctx) {
  const pos = ctx.position;

  const raw = ctx.data('addr_sma30');
  const now = Number(raw);
  if (!Number.isFinite(now) || now <= 0) return null;

  const hist = ctx.state.hist || [];
  hist.push(now);
  if (hist.length > 30) hist.shift();
  ctx.state.hist = hist;
  if (hist.length < 30) return null;
  const past = hist[0];

  const price = ctx.price;
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  const uptrend = price > sma200;

  // Demand expanding vs ~30 days ago (hysteresis to cut noise).
  const demandUp = now > past * 1.005;

  if (pos > 0) {
    const demandDown = now < past * 0.995;
    if (demandDown || !uptrend) return { side: 'sell', qty: pos };
    return null;
  }
  if (demandUp && uptrend) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
