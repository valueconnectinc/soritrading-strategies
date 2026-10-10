/*
 * @coinsori-strategy v1
 * name: VolTarget Crypto Trend Basket 1D
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, BNBUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: A different family from the mean-reversion champion — this one
 * rides long trends in the 5 largest cryptos, but sizes every position by inverse
 * ATR so each asset contributes the SAME daily risk to the account. Equal-risk
 * sizing plus a 200-day trend gate is what keeps drawdown small while still
 * capturing bull markets.
 * When it buys and sells: On each asset, buy when price is above its 200-day
 * average (bull regime) and it is not in cooldown. Size = 0.5% of equity risked
 * per ATR unit, capped at 20% of equity per asset. Sell when price closes below
 * its 20-day EMA (trend broke) or falls 2.5 ATR below entry (hard stop). 3-day
 * cooldown after any trade.
 * When it does NOT work: In a long sideways chop with no sustained trend it buys
 * late and exits on every fake-out (many small losses). It holds only during bull
 * regimes, so in a bear market it sits in cash (protects capital, earns nothing).
 * A single asset that melts up in a straight line still lags holding that asset.
 */
function onUpdate(ctx) {
  const sym = ctx.sym;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) { ctx.watch([]); return null; }

  const sma200 = ctx.sma(200, 1);
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  if (sma200 == null || ema20 == null || atr == null || atr <= 0) { ctx.watch([]); return null; }

  // Per-symbol cooldown: ctx.state is ONE object shared by all 5 symbols, so key by sym
  // (the momentum-rotation failure showed the cost of forgetting this).
  if (!ctx.state.cd) ctx.state.cd = {};
  const cds = ctx.state.cd;
  if (cds[sym] == null) cds[sym] = 0;
  if (cds[sym] > 0) cds[sym]--;

  const pos = ctx.position;
  if (pos > 0) {
    // Hard stop = insurance against a gap through the EMA; 2.5 ATR below entry.
    const stopPx = ctx.entryPx - 2.5 * atr;
    if (price < ema20 || price < stopPx) {
      cds[sym] = 3;
      ctx.watch([]);
      return { side: 'sell', qty: pos };
    }
    ctx.watch([
      { side: 'sell', price: ema20, trigger: 'below', qty: pos, note: '20d EMA break' },
      { side: 'sell', price: stopPx, trigger: 'below', qty: pos, note: '2.5 ATR hard stop' },
    ]);
    return null;
  }

  // Entry: bull regime = price above the 200-day average. Size by inverse-ATR so every
  // asset risks ~0.5% of equity per ATR unit (equal risk contribution), capped at 20%
  // of equity per asset so the basket can never deploy more than ~100%.
  if (price > sma200 && cds[sym] === 0) {
    const riskBudget = 0.005 * ctx.cash;
    let qty = riskBudget / atr;
    const maxQty = (ctx.cash / price) * 0.20;
    qty = Math.min(qty, maxQty);
    if (qty > 0) {
      cds[sym] = 3;
      ctx.watch([]);
      return { side: 'buy', qty: qty };
    }
  }

  // Flat and not buying: declare what we wait for (only when price is below the gate).
  if (price < sma200) {
    ctx.watch([{ side: 'buy', price: sma200, trigger: 'above', note: 'above 200d SMA' }]);
  } else {
    ctx.watch([]); // in cooldown — waiting on time, no price line
  }
  return null;
}
