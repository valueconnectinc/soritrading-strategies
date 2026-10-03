/*
 * @coinsori-strategy v1
 * name: ADA Keltner MR 4H Trend-Gated Vol-Confirmed
 * ex: binance
 * syms: ADAUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The 200-SMA trend-gated Keltner mean-reversion already cut ADA's
 * drawdown in half and beat buy-and-hold on all windows, but the recent 2024-26 window
 * still lost ~10%. That loss comes from buying pullbacks that keep falling. This version
 * adds a volume filter: only buy a pullback when it arrives on BELOW-average volume —
 * a healthy dip in an uptrend, not a high-volume breakdown. Low-volume pullbacks in an
 * uptrend are more likely to snap back to the mid-band.
 * When it buys and sells: buys when price closes below EMA20 minus 2.5x ATR, RSI(14)<40,
 * price above the 200-SMA (uptrend), AND the bar's volume is below the 20-bar average.
 * Sells when price recovers back above the 20-EMA. 2-bar cooldown cuts whipsaw.
 * When it does NOT work: in a straight-line melt-up it lags buy-and-hold (sits in cash);
 * in a slow grinding bear it may never get the low-volume pullback it wants, so it stays
 * flat. Defensive pullback strategy, not a chaser.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const avgVol = ctx.avgVol(20);
  const vol = ctx.vol;
  if (ema20 == null || atr == null || atr <= 0 || rsi == null || sma200 == null || avgVol == null || avgVol <= 0) return null;
  if (vol == null) return null;

  const pos = ctx.position;
  const st = ctx.state;
  let cd = st.cd || 0;
  if (cd > 0) cd--;
  st.cd = cd;

  if (pos > 0) {
    // Exit once price recovers above the 20-EMA (channel mid). No hard stop:
    // the mid-band exit is what makes this recipe work on 4h.
    if (price > ema20 && cd === 0) {
      st.cd = 2;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const keltnerLow = ema20 - 2.5 * atr; // 2.5 ATR below EMA20 = volatility-adaptive lower band
  // 200-SMA trend gate: only buy pullbacks in an uptrend, to avoid bear-market knives
  // Volume filter: only take the pullback if it is NOT a high-volume breakdown
  // (below-average volume = healthy dip, more likely to mean-revert)
  if (price < keltnerLow && rsi < 40 && price > sma200 && vol <= avgVol && cd === 0) {
    st.cd = 2;
    return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
  }
  return null;
}
