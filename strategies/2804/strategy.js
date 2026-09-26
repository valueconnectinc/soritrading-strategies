/*
 * @coinsori-strategy v1
 * name: ETH 4H Band-Bounce Champion + Fed Gate + Crash Guard
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The band-bounce mean-reversion champion (buy panic dips to
 * the lower Bollinger band with oversold RSI, above a 200-SMA uptrend) is the
 * most validated family in the ledger — defensive, low drawdown. Its two known
 * weaknesses are (1) buying dips during a Fed tightening cycle, and (2) buying
 * dips during a non-policy leverage-flush crash where the fed gate stays silent.
 * The fed gate (slow, policy-driven) was already validated. This version ADDS a
 * fast volatility/crash guard: when ATR spikes sharply above its recent norm, a
 * crash is underway regardless of cause — the strategy stands aside on new buys
 * and tightens its exit stop so it does not catch falling knives.
 * When it buys and sells: buys a panic dip (price below the lower Bollinger
 * band, RSI<30, price above the 200-SMA) and sells at the mid-band, on RSI
 * recovery above 50, or a stop. It takes NO buy while the fed is tightening OR
 * while volatility is spiking (ATR well above its recent average).
 * When it does NOT work: if a violent flush is over so fast that ATR has not
 * spiked by the time a genuine panic-bottom forms, the guard can keep it in
 * cash and miss the bounce; and in a slow grind lower without ATR spikes the
 * crash guard adds nothing (the fed gate still helps there).
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const fedNow = ctx.data('fed');
  const fedLag = ctx.data('fed_lag30');
  if (fedNow == null || fedLag == null) return null;
  const tightening = fedNow > fedLag + 0.5;

  const atr = ctx.atr(14, 1);
  const pos = ctx.position;
  const crash = crashGuard(ctx, atr);

  if (pos > 0) {
    const bb = ctx.bb(20, 2, 1);
    const rsi = ctx.rsi(14, 1);
    if (bb == null || rsi == null || atr == null) return null;
    const mid = bb.mid;
    const entry = ctx.entryPx;
    const stopMult = crash ? 3.5 : 6;
    if (price >= mid || rsi > 50 || (entry != null && price <= entry - stopMult * atr)) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (tightening || crash) return null;

  const sma200 = ctx.sma(200, 1);
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  if (sma200 == null || bb == null || rsi == null) return null;
  if (price <= sma200) return null;
  if (price > bb.lower) return null;
  if (rsi >= 30) return null;

  const lastTrade = ctx.state.lastTradeBar != null ? ctx.state.lastTradeBar : -1e9;
  if (ctx.i - lastTrade < 5) return null;
  ctx.state.lastTradeBar = ctx.i;

  return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
}

// True when current ATR is sharply above its recent norm -> a crash is underway.
function crashGuard(ctx, atr) {
  if (atr == null) return false;
  // Rolling 50-bar window of ATR (pushed once per bar).
  const hist = ctx.state.atrHist;
  const lastBar = ctx.state.atrBar;
  if (lastBar !== ctx.i) {
    if (!hist) ctx.state.atrHist = [];
    ctx.state.atrHist.push(atr);
    if (ctx.state.atrHist.length > 50) ctx.state.atrHist.shift();
    ctx.state.atrBar = ctx.i;
  }
  const s = ctx.state.atrHist;
  if (s.length < 50) return false;
  let sum = 0;
  for (let i = 0; i < s.length; i++) sum += s[i];
  const avg = sum / s.length;
  // Spike = ATR more than 1.4x its 50-bar average (sensitive enough to fire on flushes).
  return atr > 1.4 * avg;
}
