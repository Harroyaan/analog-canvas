/** Hosted releases opt into managed resources; signed-out visitors use the direct path. */
export function resolveSimulationTransport(
  configured?: string,
  signedIn = true,
): "managed" | "direct" {
  if (!signedIn) return "direct";
  if (configured === "managed" || configured === "direct") return configured;
  return "direct";
}
