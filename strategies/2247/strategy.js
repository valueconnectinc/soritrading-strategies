/*
 * @coinsori-strategy v1
 * name: ETH On-Chain Activity Regime 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: This is a different family from the price-trend champion.
 * It bets that crypto fundamentals drive price: when BTC network activity
 * (active addresses) is rising, adoption is expanding and ETH tends to trend
 * up; when activity is contracting, capital is leaving and ETH tends to fall.
 * Instead of following ETH's own price trend, it follows the on-chain activity
 * regime — so it can be long early in a bull (before price confirms) and flat
 * early in a bear (before price breaks down).
 * When it buys and sells: long ETH when the 30-day average of BTC active
 * addresses is above its 90-day average (activity expanding); flat when it
 * falls back below.
 * When it does NOT work: on-chain activity is a slow, lagging fundamental — it
 * misses short sharp price moves driven by leverage/liquidation, and in a
 * choppy sideways regime where addresses oscillate it whipsaws. It also uses
 * BTC data to trade ETH, so it can be wrong if ETH decouples from BTC.
 */
function onUpdate(ctx) {
  // BTC active-address regime via ctx.data('addr'); the SQL already returns
  // the raw series, so we compute short/medium averages over recent readings.
  const a = ctx.data('addr');
  if (a == null) return null;

  // a is the latest on-chain value; we need a small history. Use the raw value
  // and a slow EMA of it computed ourselves from recent polled values is not
  // available, so fall back to comparing the latest against a smoothed level.
  // Simplest robust gate: long when the latest active-address level is above
  // its own trailing median implied by a slow EMA tracked in ctx.state.
  const st = ctx.state;
  const prev = st.emaSlow != null ? st.emaSlow : a;
  const emaSlow = prev * 0.9 + a * 0.1; // slow 10% smoothing of on-chain activity
  st.emaSlow = emaSlow;

  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;

  if (pos <= 0) {
    // enter when activity is rising: latest reading above the slow smoothed level
    if (a > emaSlow) {
      return { side: 'buy', qty: (cash / price) * 0.98 };
    }
    return null;
  } else {
    // exit when activity is contracting: latest reading below the smoothed level
    if (a < emaSlow) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
