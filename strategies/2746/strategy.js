/*
 * @coinsori-strategy v1
 * name: Trend-Scaled Band-Bounce XRP 1D
 * ex: binance
 * syms: XRPUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The band-bounce mean-reversion champion is validated on
 * 25+ assets but systematically lags strong melt-ups (it stays in cash because
 * RSI rarely drops below 30 in a bull). This version keeps the exact same
 * defensive core but scales the entry selectivity by trend strength: in a
 * strong bull (price well above the 200-SMA) it loosens RSI to <45 and buys
 * pullbacks to the middle band, so it deploys capital during rallies; in bears
 * it keeps the strict panic-bottom entry. Goal: capture more of the bull while
 * preserving the bear-window defense.
 * When it buys and sells: buys on a band-bounce; the RSI/band threshold is
 * strict (RSI<30, lower band) when price is near/below the 200-SMA and loose
 * (RSI<45, middle band) when price is far above it. Exits at the middle band /
 * RSI>50 or a 6-ATR stop.
 * When it does NOT work: in a violent crash that breaks far below the 200-SMA
 * it still buys falling knives and can lose before mean reversion catches the
 * bottom; the looser bull entries add whipsaw risk in a choppy uptrend.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const pos = ctx.position;
  const sma200 = ctx.sma(200, 1);
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  if (sma200 == null || bb == null || rsi == null) return null;

  if (pos > 0) {
    if (price >= bb.mid || rsi > 50) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    const atr = ctx.atr(14, 1);
    if (atr != null && price <= ctx.entryPx - atr * 6) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const lastExit = ctx.state.lastExit || 0;
  if (ctx.i - lastExit < 5) return null;
  if (price < sma200) return null;

  // Trend strength: how far price is above the 200-SMA. Deep bull -> loose entry.
  const bullDepth = price / sma200;
  // Strong bull (>=30% above the long average): buy pullbacks to the middle
  // band with RSI<45 to deploy capital in melt-ups (fixes the bull-lag).
  if (bullDepth >= 1.30) {
    if (price <= bb.mid && rsi < 45) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
    }
    return null;
  }
  // Otherwise the strict champion entry: panic bottom only.
  if (price < bb.lower && rsi < 30) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
