/*
 * @coinsori-strategy v1
 * name: SOL-XRP 4H Trend-Gated Keltner MR
 * ex: binance
 * syms: SOLUSDT, XRPUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The base Keltner mean-reversion is positive on all ten disjoint
 * SOL/XRP 4h windows in the ledger, but it carries a 22-49% drawdown because it buys
 * pullbacks even while the market is falling. Adding a rising 200-bar SMA gate (the
 * defensive filter that made the Bollinger champion work) should keep it out of
 * downtrends and cut that drawdown.
 * When it buys and sells: on each asset, buy only when price closes below the lower
 * Keltner band (EMA20 - 2.5x ATR) with RSI<40 AND the 200-bar SMA is rising; sell when
 * price closes back above the 20-EMA. A 2-bar cooldown cuts whipsaw.
 * When it does NOT work: in a broad coordinated bear both rising-trend gates stay flat
 * (capital safe but little upside); it still lags a straight-line melt-up of one asset.
 */
function onUpdate(ctx) {
  const sym = ctx.sym;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  if (ema20 == null || atr == null || atr <= 0 || rsi == null || sma200 == null || sma200prev == null) return null;

  const pos = ctx.pos(sym);
  const st = ctx.state;
  let cd = st.cd || 0;
  if (cd > 0) cd--;
  ctx.state.cd = cd;

  if (pos > 0) {
    // Exit once price recovers back above the 20-EMA (channel mid). No hard stop:
    // the mid-band exit is what makes this recipe work (a hard stop whipsaws on 4h).
    if (price > ema20 && cd === 0) {
      ctx.state.cd = 2;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const uptrend = sma200 > sma200prev; // only buy in a confirmed rising 200-bar regime
  if (!uptrend) return null;

  const keltnerLow = ema20 - 2.5 * atr; // 2.5 ATR below EMA20 = volatility-adaptive lower band
  if (price < keltnerLow && rsi < 40 && cd === 0) {
    ctx.state.cd = 2;
    return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
  }
  return null;
}
