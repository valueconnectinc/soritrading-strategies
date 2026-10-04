/*
 * @coinsori-strategy v1
 * name: 5-Asset 4H Momentum-Pullback Basket
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT, ADAUSDT, LINKUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The validated deep-oversold MR basket only buys crashes and lags
 * straight melt-ups. This is the OPPOSITE family: it rides uptrends by buying SHALLOW
 * pullbacks (healthy dips that never go oversold) inside a confirmed uptrend, so it can
 * capture trending bull markets instead of waiting for capitulation.
 * When it buys and sells: on each asset, buy when price is above a rising 200-SMA (uptrend)
 * and pulls back to the 20-EMA with RSI(14) in the 40-60 zone (a healthy dip, not a crash);
 * sell when RSI climbs over 70 (overbought) or price closes back below the 20-EMA (trend
 * broke). 2-bar cooldown cuts whipsaw. Each leg is sized to ~20% of equity.
 * When it does NOT work: in a choppy sideways market with no sustained trend, the shallow
 * pullbacks keep failing and it churns (many small losses); in a broad bear it stays flat
 * (capital safe, no upside). This is a trend-riding basket, not a crash buyer.
 */
function onUpdate(ctx) {
  const sym = ctx.sym;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const ema20 = ctx.ema(20, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  const rsi = ctx.rsi(14, 1);
  if (ema20 == null || sma200 == null || sma200prev == null || rsi == null) return null;

  const pos = ctx.pos(sym);
  const st = ctx.state;
  let cd = st.cd || 0;
  if (cd > 0) cd--;
  st.cd = cd;

  if (pos > 0) {
    // Exit on overbought (RSI>70) or trend break (close below 20-EMA).
    // RSI>70 catches the run-up top; below-EMA catches a broken pullback trend.
    if ((rsi > 70 || price < ema20) && cd === 0) {
      st.cd = 2;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Trend gate: price above a RISING 200-SMA (uptrend confirmed, not just a bounce).
  const uptrend = price > sma200 && sma200 > sma200prev;
  // Shallow-pullback entry: price back at the 20-EMA with RSI 40-60 (healthy dip,
  // NOT oversold). RSI<60 excludes chasing a hot run; RSI>40 excludes crash-buying.
  const shallowDip = price <= ema20 && rsi >= 40 && rsi <= 60;

  if (uptrend && shallowDip && cd === 0) {
    st.cd = 2;
    const qty = (ctx.cash / price) * 0.20; // 20% of equity per leg, same sizing as MR basket
    if (qty <= 0) return null;
    return { side: 'buy', qty: qty };
  }
  return null;
}
