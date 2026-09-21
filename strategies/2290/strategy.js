/*
 * #338 프로브 (2026-09-21) — 2286 사본에서 **한 줄만** 다르다:
 *   원본:  if (Math.abs(diff) < 0.0001 * Math.max(0.0001, curQty)) return null;
 *   여기:  if (Math.abs(diff) < 0.05   * Math.max(0.0001, curQty)) return null;
 * 즉 포지션의 5% 미만 조정은 안 낸다. 원본은 0.01% 미만만 걸러서 사실상 매 서브이벤트마다 냈다.
 * 수익률이 무너지면: 1,474배는 **미세 리밸런스가 경로 가격에 공짜로 체결된 것**에서 왔다.
 * 그러면 손볼 자리는 intrabar 자체가 아니라 엔진의 최소 주문(먼지) 처리다.
 */
function onUpdate(ctx) {
  const atr = ctx.atr(14, 1);
  const sma50 = ctx.sma(50, 1);
  const price = ctx.price;
  const cash = ctx.cash;
  const pos = ctx.position;
  if (atr == null || sma50 == null || price == null || price <= 0) return null;

  const equity = cash + pos * price;
  const trendUp = price > sma50;
  const crashDist = 3.0 * atr;
  const crashStop = price < sma50 - crashDist;

  let targetQty;
  if (crashStop) {
    targetQty = 0;
  } else {
    const trendStrength = (price - sma50) / atr;
    let volTarget;
    if (trendUp) {
      volTarget = 0.02 + 0.03 * Math.min(1, Math.max(0, trendStrength));
    } else {
      const distFrac = 1 - (sma50 - price) / crashDist;
      volTarget = 0.02 * Math.max(0.1, distFrac);
    }
    const targetValue = (volTarget * equity) / (atr / price);
    targetQty = targetValue / price;
  }

  const curQty = pos;
  const diff = targetQty - curQty;
  if (Math.abs(diff) < 0.05 * Math.max(0.0001, curQty)) return null;

  if (diff > 0) {
    const buyQty = Math.min(diff, (cash / price) * 0.98);
    if (buyQty <= 0) return null;
    return { side: 'buy', qty: buyQty };
  } else {
    return { side: 'sell', qty: Math.min(curQty, -diff) };
  }
}
