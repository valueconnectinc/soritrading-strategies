/*
 * @coinsori-strategy v1
 * name: SOL 4H Stochastic RSI Mean-Reversion
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: A different timing signal inside the proven mean-reversion
 *   family. Instead of buying when price pierces the lower Bollinger band (the
 *   champion's trigger), Stochastic RSI pinpoints WHEN a pullback is exhausted —
 *   it is an oscillator designed to catch reversals, potentially entering
 *   earlier and with better timing than the band-bounce.
 * When it buys and sells: Buy when Stoch RSI is deeply oversold (K below 15) and
 *   starts turning up (K crosses above D). Sell on a 25% trailing stop from the
 *   entry, or when Stoch RSI becomes overbought (K above 80) to lock gains.
 * When it does NOT work: In prolonged bear trends, oversold stays oversold and
 *   catching falling knives loses money. It also whipsaws in choppy ranges where
 *   the oscillator flickers across the oversold line. Best in ranging or mildly
 *   trending markets, not strong one-way moves.
 */
function onUpdate(ctx) {
  // Stoch RSI: RSI(14) then its stochastic (14,3,3) on the previous closed bar
  const s = ctx.stoch(14, 3, 1);
  const sPrev = ctx.stoch(14, 3, 2);
  if (s == null || sPrev == null) return null;
  const K = s.k, D = s.d;
  const Kp = sPrev.k, Dp = sPrev.d;
  if (K == null || D == null || Kp == null || Dp == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    // lock gains when overbought
    if (K > 80) return { side: 'sell', qty: pos };
    // trailing stop: give back 25% from entry
    if (price < ctx.entryPx * 0.75) return { side: 'sell', qty: pos };
    return null;
  }

  // oversold + turning up (K crosses above D while deeply oversold)
  if (K < 15 && Kp <= Dp && K > D) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
