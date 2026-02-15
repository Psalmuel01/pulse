import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const PulseSubscriptionsModule = buildModule("PulseSubscriptionsModule", (m) => {
  const pathUsdAddress = m.getParameter(
    "pathUsdAddress",
    process.env.TEMPO_PATHUSD_ADDRESS ??
      process.env.TEMPO_STABLECOIN_ADDRESS ??
      "0x20c0000000000000000000000000000000000001"
  );

  const pulseSubscriptions = m.contract("PulseSubscriptions", [pathUsdAddress]);

  return { pulseSubscriptions };
});

export default PulseSubscriptionsModule;
