/*
 * @coinsori-strategy v1
 * name: Multi-Asset Defensive Keltner MR Basket (v1 baseline)
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The ATR-adaptive Keltner mean-reversion recipe is the most robust
 * cross-asset defensive edge in the ledger. Running the SAME validated recipe on a basket of
 * four large cryptos (BTC/ETH/SOL/XRP) lets the basket catch a mean-reversion flush in
 * WHICHEVER asset is dipping. Each asset is traded independently at 25% of total equity.
 * When it buys and sells: For each asset, buy when price closes below the ATR-adaptive lower
 * Keltner band (EMA20 - 2.5x ATR) with RSI below 40, but ONLY while that asset's 200-day
 * average is rising. Sell when price snaps back above the 20-day EMA or RSI climbs above 60.
 * When it does NOT work: In a broad crypto-wide bear where ALL four assets fall together,
 * the rising-200-day gate keeps us flat. It lags a relentless single-asset melt-up because
 * it only buys pullbacks. Defensive by design.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  if (ema20 == null || atr == null || rsi == null || sma200 == null || sma200prev == null || atr <= 0) return null;

  const pos = ctx.position;
  const lowerBand = ema20 - 2.5 * atr;

  if (pos > 0) {
    if (price > ema20 || rsi > 60) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const uptrend = sma200 > sma200prev;
  if (uptrend && price < lowerBand && rsi < 40) {
    const equity = ctx.cash + ctx.uPnl;
    const targetValue = 0.25 * (Number.isFinite(equity) && equity > 0 ? equity : ctx.cash);
    const qty = targetValue / price;
    return { side: 'buy', qty: qty };
  }
  return null;
}
