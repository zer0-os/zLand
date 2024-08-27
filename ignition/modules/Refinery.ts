import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const RefineryModule = buildModule("RefineryModule", (m) => {
  const refinery = m.contract("Refinery");

  return { refinery };
});

export default {RefineryModule};
