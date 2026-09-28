/*
 * @coinsori-strategy v1
 * name: BTC 4H Keltner ATR-Adaptive Mean-Reversion
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: BTC overshoots to the downside on fear and snaps back.
 * This is the Keltner-channel mean-reversion recipe that validated POSITIVE on
 * 4/4 walk-forward windows on ETH 4h (+92.8/+90.5/+22.2/+11.3, MDD 14-29%).
 * It buys a deep dip below an ATR-adaptive Keltner lower band when oversold,
 * then sells the bounce back to the middle (EMA20). The ATR-adaptive band
 * widens with volatility, so it only buys when the dip is genuinely extreme
 * relative to recent chop, and the 2-bar cooldown avoids re-entering a falling
 * knife. This test checks whether the ETH edge generalizes to BTC or was
 * ETH-specific overfit.
 * When it buys and sells: buys when price closes below EMA20 - 2.5x ATR with
 * RSI below 40, and at least 2 bars since the last trade; sells when price
 * returns to the EMA20 middle band or RSI climbs above 60.
 * When it does NOT work: in a strong melt-up it sits in cash and badly lags
 * buy-and-hold (defensive by design). In a sustained bear it can buy dips that
 * keep falling. In very tight chop the band is rarely touched, so returns are
 * small. If BTC does not mean-revert the way ETH does, this window test will
 * show it as a loss.
 */
function onUpdate(ctx) {
  const ema = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const rsi = ctx.rsi(14, 1);
  const px = ctx.closes[ctx.closes.length - 2];
  if (ema == null || atr == null || rsi == null || px == null) return null;

  const lower = ema - 2.5 * atr; // 2.5 ATR: wide enough to only catch extreme dips, from validated ETH recipe

  // Exit: bounce back to the middle band, or RSI no longer oversold.
  if (ctx.position > 0) {
    if (px >= ema || rsi > 60) return { side: 'sell', qty: ctx.position };
    return null;
  }

  // 2-bar cooldown after last trade to avoid catching a falling knife repeatedly.
  const lastTrade = ctx.state.lastTradeBar || -99;
  if (ctx.i - lastTrade < 2) return null;

  // Entry: deep dip below the ATR-adaptive lower band + oversold.
  if (px <= lower && rsi < 40) {
    // Size by band depth: risk 4% of equity on the band-to-mid distance.
    const equity = ctx.cash + ctx.position * ctx.price;
    const bandDist = Math.max(ema - lower, atr);
    const qty = Math.max(0, Math.min((equity * 0.04) / bandDist, (ctx.cash / ctx.price) * 0.95));
    if (qty > 0) {
      ctx.state.lastTradeBar = ctx.i;
      return { side: 'buy', qty: qty };
    }
  }
  return null;
}
