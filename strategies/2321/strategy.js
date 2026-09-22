/*
 * @coinsori-strategy v1
 * name: DOT Band Bounce Funding-Filter 4H
 * ex: binance
 * syms: DOTUSDT
 * interval: 4h
 * cash: 1000
 *
 * Why this strategy: DOT is the strongest proven band-bounce asset (mean reversion
 * beat buy-and-hold in 2/3 windows with low MDD). This variant adds a funding
 * regime filter on top of the proven mechanism. Funding (populated on 4h futures)
 * is the price of leverage: deeply negative funding = crowded shorts (prone to
 * squeeze), strongly positive funding = crowded longs (bounce may fail). Filtering
 * the lower-band oversold entry with funding avoids the worst falling-knife and
 * failing-bounce cases, which is the band-bounce family's documented weakness.
 * When it buys: price touches the lower Bollinger band, RSI oversold (<35), price
 * above the 200-SMA, AND funding is not deeply negative (not a crowded-short crash).
 * When it sells: half at the middle band, the rest on a trailing stop (8% from
 * peak) or RSI overbought, or a hard 12% stop below entry.
 * When it does NOT work: same as plain band-bounce — it lags sustained bull runs
 * (only buys on deep dips) and stays in cash in strong downtrends. If funding is
 * stale/absent the filter adds little.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  if (bb == null || rsi == null || sma200 == null) return null;
  const px = ctx.price;
  if (px == null) return null;
  const pos = ctx.position || 0;
  const entry = ctx.entryPx || 0;

  // ---- ENTRY: deep oversold bounce at lower band, in uptrend, funding not a crash ----
  if (pos === 0) {
    if (px <= bb.lower && rsi < 35 && px > sma200) {
      const f = ctx.funding;
      // Skip deeply negative funding = crowded-short crash, e.g. falling knife.
      if (f != null && f < -0.0005) return null;
      ctx.state.peak = px;
      ctx.state.halfKept = 0;
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    return null;
  }

  // ---- EXITS (same as proven DOT band-bounce) ----
  if (entry > 0 && px < entry * 0.88) {
    ctx.state.peak = 0; ctx.state.halfKept = 0;
    return { side: 'sell', qty: pos };
  }
  const peak = Math.max(ctx.state.peak || entry || px, px);
  ctx.state.peak = peak;
  if (rsi > 65) {
    ctx.state.peak = 0; ctx.state.halfKept = 0;
    return { side: 'sell', qty: pos };
  }
  if (ctx.state.halfKept === 0 && px >= bb.mid) {
    ctx.state.halfKept = pos / 2;
    return { side: 'sell', qty: pos - ctx.state.halfKept };
  }
  if (ctx.state.halfKept > 0 && px < peak * 0.92) {
    ctx.state.peak = 0; ctx.state.halfKept = 0;
    return { side: 'sell', qty: pos };
  }
  return null;
}
