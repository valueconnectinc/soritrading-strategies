/*
 * @coinsori-strategy v1
 * name: DOT Band Bounce On-Chain Filter 4H
 * ex: binance
 * syms: DOTUSDT
 * interval: 4h
 * cash: 1000
 *
 * Why this strategy: The band-bounce mean-reversion edge is the most validated
 * idea in this account — it works on low-volatility mature alts (DOT/LTC/XRP):
 * it beat buy-and-hold in 2/3 windows and crushed both bear markets with only
 * 22-27% drawdown. This version adds a sentiment regime filter from the on-chain
 * data that IS backfilled (fear & greed index) to avoid buying oversold bounces
 * during extreme-fear capitulation, which is where the bounce can keep falling.
 * When it buys: price touches the lower Bollinger band, RSI is oversold (<35),
 * price is above the 200-SMA, AND the fear&greed index is not in deep panic
 * (>= 15) so we are not catching a still-falling knife.
 * When it sells: RSI turns overbought (>65), or a trailing stop (price falls 8%
 * from peak after entry), or a hard 12% stop below entry.
 * When it does NOT work: in a violent one-way crash the sentiment gate can keep
 * us in cash and we miss the eventual rebound; and in a straight parabolic bull
 * we only buy on deep lower-band touches so we lag buy-and-hold. It is a
 * defensive strategy, not a momentum rider.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  if (bb == null || rsi == null || sma200 == null) return null;
  const px = ctx.price;
  if (px == null) return null;

  // On-chain sentiment filter (fear & greed index, 0-100). Null = unknown, skip.
  const fg = ctx.data('fear_greed');
  if (fg == null) return null;

  const pos = ctx.position || 0;
  const entry = ctx.entryPx || 0;

  // ---- ENTRY: deep oversold bounce at the lower band, uptrend, not deep panic ----
  if (pos === 0) {
    // fg >= 15 avoids buying during extreme-fear capitulation where bounces keep failing.
    if (px <= bb.lower && rsi < 35 && px > sma200 && fg >= 15) {
      ctx.state.peak = px;
      ctx.state.halfKept = 0;
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    return null;
  }

  // ---- EXITS ----
  // Hard stop: real breakdown, exit everything.
  if (entry > 0 && px < entry * 0.88) {
    ctx.state.peak = 0; ctx.state.halfKept = 0;
    return { side: 'sell', qty: pos };
  }

  const peak = Math.max(ctx.state.peak || entry || px, px);
  ctx.state.peak = peak;

  // RSI overbought: bounce fully played out.
  if (rsi > 65) {
    ctx.state.peak = 0; ctx.state.halfKept = 0;
    return { side: 'sell', qty: pos };
  }

  // Scale out half at the middle band so winners can run with a trailing stop.
  if (ctx.state.halfKept === 0 && px >= bb.mid) {
    ctx.state.halfKept = pos / 2;
    return { side: 'sell', qty: pos - ctx.state.halfKept };
  }

  // Trailing stop on the running half.
  if (ctx.state.halfKept > 0 && px < peak * 0.92) {
    ctx.state.peak = 0; ctx.state.halfKept = 0;
    return { side: 'sell', qty: pos };
  }

  return null;
}
