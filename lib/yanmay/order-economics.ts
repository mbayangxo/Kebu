/** All monetary amounts are integer minor currency units. No floating-point money. */
export type OrderEconomicsInput = {
  netSales: number;
  ingredientCost: number;
  packagingCost: number;
  directLabor: number;
  paymentFees: number;
  creatorRoyalties: number;
  otherVariableCost: number;
  allocatedOverhead: number;
};
export function orderEconomics(input: OrderEconomicsInput) {
  for (const key of ['netSales','ingredientCost','packagingCost','directLabor','paymentFees','creatorRoyalties','otherVariableCost','allocatedOverhead'] as const) {
    if (!Number.isSafeInteger(input[key]) || input[key] < 0) throw new RangeError('Invalid minor-unit amount: ' + key);
  }
  const cogs = input.ingredientCost + input.packagingCost + input.directLabor;
  const grossProfit = input.netSales - cogs;
  const variableCost = cogs + input.paymentFees + input.creatorRoyalties + input.otherVariableCost;
  const contribution = input.netSales - variableCost;
  const allocatedProfit = contribution - input.allocatedOverhead;
  if (![cogs, variableCost, grossProfit, contribution, allocatedProfit].every(Number.isSafeInteger)) throw new RangeError('Money overflow');
  return { cogs, grossProfit, variableCost, contribution, allocatedProfit,
    contributionMargin: input.netSales === 0 ? null : contribution / input.netSales };
}
