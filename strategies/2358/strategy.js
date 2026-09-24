/*
 * @coinsori-strategy v1
 * name: LTC Band-Bounce Fear-Confirmed 1D
 * ex: binance
 * syms: LTCUSDT
 * interval: 1d
 * cash: 1000
 *
 * Why this strategy: the champion band-bounce mean reversion (lower Bollinger band +
 * RSI oversold + cooldown) is validated but its MDD comes from buying falling knives
 * in sustained downtrends. The fear/greed index is a sentiment gauge: extreme fear
 * marks capitulation bottoms, extreme greed marks tops. The ledger showed sentiment
 * is NOT a standalone profit engine but DOES work as an entry-timing filter. This
 * tests confirming each lower-band bounce with a FEARFUL sentiment reading, hoping
 * to keep the capitulation bounces (the edge) while filtering out random dips that
 * keep falling. Sentiment+price hybrid — a different family than pure price MR.
 * When it buys and sells: buy when price closes at/below lower Bollinger band with
 * RSI oversold AND fear/greed index below 40 (fearful) AND 5+ bars since last exit;
 * sell at middle band or RSI overbought.
 * When it does NOT work: in a bull pullback where price dips to the lower band but
 * sentiment stays neutral/greedy, it stays in cash and misses the bounce; and the
 * daily fear index may lag the 1D price signal.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2);
  if (bb == null) return null;

  const rsi = ctx.rsi(14);
  const rsi_1 = ctx.rsi(14, 1);
  if (rsi == null || rsi_1 == null) return null;

  // fear/greed index (0=extreme fear, 100=extreme greed); null = unknown
  const fg = ctx.data('fear_greed');
  if (fg == null) return null; // without sentiment data, do nothing

  const lower = bb.lower;
  const mid = bb.mid;

  // cooldown state: bar index of the last exit (default far in the past)
  const lastExit = ctx.state.lastExit || -9999;
  const barsSinceExit = ctx.i - lastExit;
  const cooldownOk = barsSinceExit >= 5; // 5-bar wait after each exit

  // BUY: at/below lower band AND RSI oversold AND fearful sentiment AND cooldown
  const atLowerBand = ctx.price <= lower;
  const rsiOversold = rsi < 35;
  const fearful = fg < 40; // market in fear = capitulation zone

  if (atLowerBand && rsiOversold && fearful && cooldownOk && ctx.position === 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // SELL: price at/above middle band OR RSI turns overbought
  const atMidBand = ctx.price >= mid;
  const rsiOverbought = rsi > 65 && rsi_1 <= 65;

  if ((atMidBand || rsiOverbought) && ctx.position > 0) {
    ctx.state.lastExit = ctx.i; // record exit bar for the cooldown
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
