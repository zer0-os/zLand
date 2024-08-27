import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const BondingTokenModule = buildModule("BondingTokenModule", (m) => {
  const bondingToken = m.contract("BondingTokenLinear");

  return { bondingToken };
});

export default {BondingTokenModule};
