/*
 * @coinsori-strategy v1
 * name: BTC Hashrate-Fear Dip-Buy 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: two independent forces drive long BTC moves. Hash rate
 * (the miners' total computing power) is a supply-side fundamental that leads
 * price over long stretches — a growing network means the bull is healthy.
 * Fear & Greed is a sentiment thermometer — when the crowd is fearful in the
 * middle of a healthy uptrend, that is a cheap contrarian entry. This buys
 * bull-market dips instead of chasing.
 * When it buys and sells: buy when hash rate is rising (up vs 60 days ago)
 * AND fear is high (<45) AND price is above its 50-day average. Ride while
 * price stays above the 50-day average; sell when price closes more than one
 * ATR below it, or when greed turns extreme (>85).
 * When it does NOT work: in a bear market it stays in cash (hash rate falling,
 * no signal), so it earns nothing; in a choppy bull it can buy dips that keep
 * dipping; it needs the hashrate and fear-greed data feeds to be online.
 */
function onUpdate(ctx) {
  const hr = ctx.data('hashrate_sma30');
  const fg = ctx.data('fear_greed');
  const sma = ctx.sma(50, 1);
  const atr = ctx.atr(14, 1);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  if (hr == null || fg == null || sma == null || atr == null || closePrev == null) return null;

  const hist = ctx.state.hrHist || [];
  hist.push(hr);
  if (hist.length > 120) hist.shift();
  ctx.state.hrHist = hist;
  const prev60 = hist.length >= 60 ? hist[hist.length - 60] : null;

  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;

  if (pos <= 0) {
    if (prev60 == null) return null;
    const hrRising = hr > prev60 * 1.02;
    const fearful = fg <= 45;
    const aboveSma = closePrev > sma;
    // healthy bull (hashrate up) + fear dip + above trend = buy
    if (hrRising && fearful && aboveSma) {
      return { side: 'buy', qty: (cash / price) * 0.98 };
    }
    return null;
  } else {
    const breakDown = closePrev < sma - atr;
    const greedy = fg >= 85;
    if (breakDown || greedy) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
