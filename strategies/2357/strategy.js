/*
 * @coinsori-strategy v1
 * name: LTC Band-Bounce Mean Reversion Cooldown ATR-Sized 1D
 * ex: binance
 * syms: LTCUSDT
 * interval: 1d
 * cash: 1000
 *
 * Why this strategy: the cooldown champion beats buy-and-hold on all windows but
 * still has high MDD (17-54%) because every buy goes all-in (0.99 of cash). In a
 * crash, a high-volatility entry means full exposure to the falling knife. This
 * version sizes the position by ATR: risk a fixed dollar fraction per trade, so a
 * 2xATR adverse move only loses that fraction. High-volatility (crash) entries size
 * DOWN, calm entries size UP — cutting MDD without changing the entry/exit logic
 * that defines the edge. ATR sizing improved MDD on other families (BTC hashrate,
 * ETH trend-ride), so this is a fair out-of-sample risk test.
 * When it buys and sells: same as champion — buy at/below lower Bollinger band with
 * RSI oversold AND 5+ bars since last exit; sell at middle band or RSI overbought.
 * Position size is scaled by ATR instead of all-in.
 * When it does NOT work: in a slow grind down near the lower band, the cooldown may
 * miss the bounce; and risk-sizing caps upside in violent but ultimately winning
 * bounces because it sizes down exactly when the move is biggest.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2);
  if (bb == null) return null;

  const rsi = ctx.rsi(14);
  const rsi_1 = ctx.rsi(14, 1);
  if (rsi == null || rsi_1 == null) return null;

  const atr = ctx.atr(14, 1); // use PREVIOUS bar's ATR (closed) for sizing
  if (atr == null || atr <= 0) return null;

  const lower = bb.lower;
  const mid = bb.mid;

  // cooldown state: bar index of the last exit (default far in the past)
  const lastExit = ctx.state.lastExit || -9999;
  const barsSinceExit = ctx.i - lastExit;
  const cooldownOk = barsSinceExit >= 5; // 5-bar wait after each exit

  // BUY: at/below lower band AND RSI oversold AND cooldown satisfied
  const atLowerBand = ctx.price <= lower;
  const rsiOversold = rsi < 35;

  if (atLowerBand && rsiOversold && cooldownOk && ctx.position === 0) {
    // risk 2% of cash per trade: a 2xATR adverse move loses that 2%
    const riskCash = ctx.cash * 0.02;
    const qty = riskCash / (2 * atr);
    // never exceed available cash
    const maxQty = ctx.cash / ctx.price * 0.99;
    return { side: 'buy', qty: Math.min(qty, maxQty) };
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
