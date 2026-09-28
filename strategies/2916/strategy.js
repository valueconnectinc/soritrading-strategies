/*
 * @coinsori-strategy v1
 * name: ETH 4H Keltner ATR-Adaptive Mean-Reversion (Gated)
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: ETH overshoots to the downside on fear and snaps back.
 * This combines the ATR-adaptive Keltner band (which widens with volatility,
 * so it only buys genuinely extreme dips) with the essential 200-bar trend
 * gate (price must be above its 200-bar average so it does not catch a falling
 * knife in a real crash). The ledger proved the 200-SMA gate is mandatory for
 * mean-reversion on ETH — without it the strategy loses catastrophically in
 * bear markets. The Keltner band + gate is a defensive snap-back harvester.
 * When it buys and sells: buys when price closes below EMA20 - 2.5x ATR with
 * RSI below 40 AND price above the 200-bar average, at least 2 bars since the
 * last trade; sells when price returns to the EMA20 middle band or RSI climbs
 * above 60.
 * When it does NOT work: in a strong melt-up it sits in cash and badly lags
 * buy-and-hold (defensive by design). In a sustained bear it rarely buys
 * because price stays below the 200-bar average. In very tight chop the band
 * is rarely touched, so returns are small. It does not work on BTC or other
 * trending assets.
 */
function onUpdate(ctx) {
  const ema = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const px = ctx.closes[ctx.closes.length - 2];
  if (ema == null || atr == null || rsi == null || sma200 == null || px == null) return null;

  const lower = ema - 2.5 * atr; // 2.5 ATR: only catch extreme dips

  // Exit: bounce back to the middle band, or RSI no longer oversold.
  if (ctx.position > 0) {
    if (px >= ema || rsi > 60) return { side: 'sell', qty: ctx.position };
    return null;
  }

  // 2-bar cooldown after last trade to avoid catching a falling knife repeatedly.
  const lastTrade = ctx.state.lastTradeBar || -99;
  if (ctx.i - lastTrade < 2) return null;

  // Entry: deep dip below the ATR-adaptive lower band + oversold, only above the 200-bar trend line.
  if (px <= lower && rsi < 40 && px > sma200) {
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
