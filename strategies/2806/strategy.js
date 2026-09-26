/*
 * @coinsori-strategy v1
 * name: ETH 4H Band-Bounce Champion + Fed Gate + Vol Scaled Size
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The band-bounce mean-reversion champion (buy panic dips to
 * the lower Bollinger band with oversold RSI, above a 200-SMA uptrend) plus the
 * validated Fed-tightening gate is the strongest family in the ledger. Its one
 * remaining weakness is drawdown (19-46%): it sizes every trade the same even
 * though a panic dip in a high-volatility regime is riskier than one in a calm
 * regime. This version keeps the champion's proven entries and exits UNCHANGED
 * but scales the position DOWN when volatility (ATR) is high, so a violent
 * regime risks less capital while a calm regime still uses full size. This is a
 * pure risk-management overlay — it should cut drawdown without sacrificing the
 * mean-reversion edge.
 * When it buys and sells: buys a panic dip (price below the lower Bollinger
 * band, RSI<30, price above the 200-SMA), sized inversely to current ATR, and
 * sells at the mid-band, on RSI recovery above 50, or a 6x ATR stop. No buy
 * while the Fed is tightening.
 * When it does NOT work: if volatility is chronically high (a long volatile
 * regime), it stays under-invested and lags buy-and-hold; and it still stands in
 * cash during a tightening cycle, missing genuine panic-bottom bounces.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const fedNow = ctx.data('fed');
  const fedLag = ctx.data('fed_lag30');
  if (fedNow == null || fedLag == null) return null;
  const tightening = fedNow > fedLag + 0.5;

  const pos = ctx.position;
  const atr = ctx.atr(14, 1);

  if (pos > 0) {
    const bb = ctx.bb(20, 2, 1);
    const rsi = ctx.rsi(14, 1);
    if (bb == null || rsi == null || atr == null) return null;
    const mid = bb.mid;
    const entry = ctx.entryPx;
    if (price >= mid || rsi > 50 || (entry != null && price <= entry - 6 * atr)) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (tightening) return null;

  const sma200 = ctx.sma(200, 1);
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  if (sma200 == null || bb == null || rsi == null || atr == null) return null;
  if (price <= sma200) return null;
  if (price > bb.lower) return null;
  if (rsi >= 30) return null;

  const lastTrade = ctx.state.lastTradeBar != null ? ctx.state.lastTradeBar : -1e9;
  if (ctx.i - lastTrade < 5) return null;
  ctx.state.lastTradeBar = ctx.i;

  // Volatility-scaled size: base full position, scaled by (calmATR / currentATR).
  // calmATR = 50-bar average of ATR. High current ATR -> smaller position.
  const hist = ctx.state.atrHist;
  if (!hist) ctx.state.atrHist = [];
  ctx.state.atrHist.push(atr);
  if (ctx.state.atrHist.length > 50) ctx.state.atrHist.shift();
  let scale = 1;
  if (ctx.state.atrHist.length >= 50) {
    let sum = 0;
    for (let i = 0; i < ctx.state.atrHist.length; i++) sum += ctx.state.atrHist[i];
    const calm = sum / ctx.state.atrHist.length;
    // Cap scale between 0.3 and 1 so we never go tiny or over-lever.
    scale = Math.max(0.3, Math.min(1, calm / atr));
  }

  const qty = (ctx.cash / price) * 0.98 * scale;
  return { side: 'buy', qty: qty };
}
