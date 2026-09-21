/*
 * @coinsori-strategy v1
 * name: Fear Greed Contrarian
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Sentiment mean reversion. Bet: when the crypto Fear & Greed index is at
 * extreme fear, the crowd is overly pessimistic and prices tend to recover;
 * when it reaches extreme greed, the crowd is overly optimistic and it is a
 * good time to take profit.
 * When it buys: Fear & Greed index drops to extreme fear (<= 25).
 * When it sells: Fear & Greed index reaches extreme greed (>= 75).
 * When it does NOT work: prolonged bear markets where "extreme fear" keeps
 * getting more extreme and the index stays pinned low for months — the
 * contrarian buy catches a falling knife.
 */
function onUpdate(ctx) {
  const fg = ctx.data('fear_greed');
  if (fg == null) return null; // sentiment data unknown yet

  const pos = ctx.position || 0;

  if (pos === 0 && fg <= 25) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  if (pos > 0 && fg >= 75) {
    return { side: 'sell', qty: pos };
  }

  return null;
}
