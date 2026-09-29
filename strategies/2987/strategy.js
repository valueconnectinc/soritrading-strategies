/*
 * @coinsori-strategy v1
 * name: BTC OI-Confirmed Trend (futures)
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Uses derivatives positioning — open interest (OI) — as a CONFIRMATION
 * of price trend, a signal source completely different from the price-action champion.
 * Rising open interest alongside a rising price means NEW longs are entering (conviction),
 * not just shorts covering. We only hold long when both price trend AND OI trend agree.
 * When OI falls while price is still up, the rally is built on weak/covering positioning and
 * we exit early — this is the defensive edge that attacks the champion's drawdown.
 * When it buys and sells: Buy when price is above its 50-day average AND open interest is
 * rising (new positioning confirms the move). Sell when price closes below the 50-day
 * average OR open interest stops rising (positioning is fading).
 * When it does NOT work: If OI data is unavailable this strategy sits flat (no trades).
 * It also misses strong squeezes that run on short-covering (falling OI) rather than new
 * longs. In a market where OI leads price by a long lag, the confirmation can be late.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const oi = ctx.binanceOi();
  ctx.log('oi raw=' + JSON.stringify(oi));
  if (oi == null) return null;
  const oiVal = (typeof oi === 'object') ? (oi.value != null ? oi.value : oi.oi) : oi;
  if (!Number.isFinite(oiVal) || oiVal <= 0) return null;

  const sma50 = ctx.sma(50, 1);
  const sma50prev = ctx.sma(50, 2);
  if (sma50 == null || sma50prev == null) return null;

  const oiBase = ctx.state.oiBase != null ? ctx.state.oiBase : oiVal;
  const oiTrendUp = oiVal > oiBase * 1.02;
  ctx.state.oiBase = oiBase * 0.9 + oiVal * 0.1;

  const pos = ctx.position;

  if (pos > 0) {
    if (price < sma50 || !oiTrendUp) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (price > sma50 && sma50 > sma50prev && oiTrendUp) {
    const equity = ctx.cash + ctx.uPnl;
    const qty = (Number.isFinite(equity) && equity > 0 ? equity : ctx.cash) / price;
    return { side: 'buy', qty: qty * 0.98 };
  }
  return null;
}
