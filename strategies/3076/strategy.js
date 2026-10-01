/*
 * @coinsori-strategy v1
 * name: Upbit BTC 1D Slow Regime Filter
 * ex: upbit
 * syms: BTC
 * interval: 1d
 * cash: 10000000
 *
 * Why this strategy: The available upbit BTC 1d history (2024-08 onward) is a strong melt-up
 * followed by a sharp drawdown. A slow, simple regime filter — long only when price holds
 * above the 100-day average, flat otherwise — is a deliberate contrast to the mean-reversion
 * family: it tries to stay long through the melt-up and step aside in the drawdown, without
 * chasing short-term trends or shorting.
 * When it buys and sells: buy when price closes back above the 100-day average; sell when it
 * closes back below it. No shorting, no leverage.
 * When it does NOT work: in a choppy sideways market it whipsaws around the 100-day line and
 * bleeds on fees; and crypto trend-following has repeatedly failed in the ledger, so this is
 * a low-prior experiment to see if the simple long/flat form fits this specific short window.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma100 = ctx.sma(100, 1);
  const sma100prev = ctx.sma(100, 2);
  if (sma100 == null || sma100prev == null) return null;

  const pos = ctx.pos('BTC');
  // Cross back above the 100-day average = regime turns up, go long.
  if (pos === 0 && price > sma100 && sma100prev >= 0) {
    // Only enter on an actual cross (previous close below the line) to cut whipsaw.
    const prevPrice = ctx.closes[ctx.closes.length - 2];
    if (prevPrice != null && prevPrice <= sma100prev) {
      return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
    }
    // If already established above the line and flat, stay flat (no chase).
    return null;
  }
  // Cross back below = regime turns down, exit to cash.
  if (pos > 0 && price < sma100 && prevCloseBelow(ctx)) {
    return { side: 'sell', qty: pos };
  }
  return null;
}

function prevCloseBelow(ctx) {
  const prevPrice = ctx.closes[ctx.closes.length - 2];
  const sma100prev = ctx.sma(100, 2);
  if (prevPrice == null || sma100prev == null) return false;
  return prevPrice < sma100prev;
}
