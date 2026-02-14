import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const PulseSubscriptionsModule = buildModule("PulseSubscriptionsModule", (m) => {
  const stablecoinAddress = m.getParameter(
    "stablecoinAddress",
    process.env.TEMPO_STABLECOIN_ADDRESS ?? "0x0000000000000000000000000000000000000001"
  );

  const pulseSubscriptions = m.contract("PulseSubscriptions", [stablecoinAddress]);

  return { pulseSubscriptions };
});

export default PulseSubscriptionsModule;
