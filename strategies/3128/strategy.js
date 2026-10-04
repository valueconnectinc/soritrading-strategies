/*
 * @coinsori-strategy v1
 * name: 5-Asset 4H Trend-Gated Keltner MR Basket
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT, ADAUSDT, LINKUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The 200-SMA trend-gated Keltner mean-reversion recipe is the most
 * validated family in the ledger (~29/32 windows positive across 11 assets, low drawdown).
 * This version runs it as a 5-asset basket so a pullback in any one asset can be bought,
 * smoothing the single-asset melt-up lag and giving the portfolio more chances to be invested.
 * When it buys and sells: on each asset, buy when price closes below EMA20 minus 2.5x ATR
 * with RSI(14)<40 while the 200-SMA is RISING (uptrend confirmed, not just price above a
 * falling average); sell when price recovers above the 20-EMA. 2-bar cooldown cuts whipsaw.
 * Each leg is sized to ~20% of equity.
 * When it does NOT work: in a broad coordinated crypto bear all trend gates stay flat
 * (capital safe, little upside); a straight-line melt-up of the whole basket still lags
 * buy-and-hold of any single asset. Defensive pullback basket, not a chaser.
 */
function onUpdate(ctx) {
  const sym = ctx.sym;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200Prev = ctx.sma(200, 50); // 200-SMA 50 bars ago (~8 days) to measure its slope
  if (ema20 == null || atr == null || atr <= 0 || rsi == null || sma200 == null || sma200Prev == null) return null;

  const pos = ctx.pos(sym);
  const st = ctx.state;
  let cd = st.cd || 0;
  if (cd > 0) cd--;
  st.cd = cd;

  if (pos > 0) {
    // Exit once price recovers above the 20-EMA (channel mid). No hard stop:
    // the mid-band exit is what makes this recipe work (a hard stop whipsaws on 4h).
    if (price > ema20 && cd === 0) {
      st.cd = 2;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const keltnerLow = ema20 - 2.5 * atr; // 2.5 ATR below EMA20 = volatility-adaptive lower band
  // RISING 200-SMA trend gate: only buy pullbacks in a confirmed uptrend (SMA slope up),
  // so we skip topping markets where price sits above a flat/falling average.
  if (price < keltnerLow && rsi < 40 && sma200 > sma200Prev && cd === 0) {
    st.cd = 2;
    // 20% of equity per leg so all 5 assets could be held, each sized to its share
    const qty = (ctx.cash / price) * 0.20;
    if (qty <= 0) return null;
    return { side: 'buy', qty: qty };
  }
  return null;
}
