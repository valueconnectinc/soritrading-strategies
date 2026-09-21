/*
 * 불변식 프로브 (2026-09-21)
 *
 * 매 호출마다 현금의 98% 로 매수하고 **절대 팔지 않는다**.
 * 현물이므로 이 전략은 구조적으로 buy&hold 를 **이길 수 없다** —
 * 잘해야 benchRet 에서 수수료만큼 못 미친다.
 *
 * ★ 그런데 결과가 benchRet 을 넘으면, 장부가 없는 돈을 만든 것이다.
 *   (의심 근거: 잡 9311 의 체결에 같은 봉·같은 가격·같은 수량 매수가
 *    3연속으로 있다. 수량이 안 줄었다 = 사이에 ctx.cash 가 안 줄었다.)
 */
function onUpdate(ctx) {
  const q = (ctx.cash / ctx.price) * 0.98;
  if (!(q > 0)) return null;
  return { side: 'buy', qty: q };
}
