/*
 * @coinsori-strategy v1
 * name: BNB 1D OI-Confirmed Momentum
 * ex: binance
 * syms: BNBUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the momentum core (90d return + 200-day average) is the validated
 * champion. This version tests a NEW axis — open-interest sentiment: a rally backed by
 * growing open interest is new money pushing price (a real trend); a rally on shrinking
 * OI is short-covering (weak). Buying only OI-confirmed strength and exiting when OI
 * rolls over uses a different information source than price alone.
 * When it buys and sells: buys when 90-day momentum is above +20%, price is above the
 * 200-day average, and open interest is above its 20-day average. Sells when momentum
 * fades below +5%, price breaks the 200-day average, or OI drops below its 20-day average.
 * When it does NOT work: if OI data is missing in backtest it silently falls back to the
 * plain momentum core; in a short-covering rally (price up, OI down) the filter wrongly
 * blocks a good buy. If OI is stale it adds no information.
 */
function onUpdate(ctx) {
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  const closes = ctx.closes;
  if (closes.length < 91) return null;
  const prevClose = closes[closes.length - 2];
  const base = closes[closes.length - 91];
  if (base == null || base <= 0) return null;
  const roc90 = (prevClose / base - 1) * 100;

  // Rolling OI history from binanceOi(). Shape unknown — coerce to a number; null when unavailable.
  const oiRaw = (typeof ctx.binanceOi === 'function') ? ctx.binanceOi() : null;
  let oi = (oiRaw && typeof oiRaw === 'object' && 'value' in oiRaw) ? oiRaw.value : oiRaw;
  if (typeof oi === 'number' && Number.isFinite(oi) && oi > 0) {
    if (!Array.isArray(ctx.state.oiHist)) ctx.state.oiHist = [];
    ctx.state.oiHist.push(oi);
    if (ctx.state.oiHist.length > 30) ctx.state.oiHist = ctx.state.oiHist.slice(-30);
  }
  const hist = ctx.state.oiHist;
  // OI above its 20-day average = new money confirming the move. null = no OI data → fallback.
  const oiUp = (hist && hist.length >= 20) ? hist[hist.length - 1] > hist[hist.length - 20] : null;

  const pos = ctx.position;
  if (pos > 0 && (roc90 < 5 || prevClose < sma200 || oiUp === false)) {
    return { side: 'sell', qty: pos };
  }
  if (pos === 0 && roc90 > 20 && prevClose > sma200 && oiUp !== false) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
