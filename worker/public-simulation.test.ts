import { describe, expect, it } from "vitest";

import { refuseSignedOutSimulation } from "./simulation";

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("https://canvas.test/api/simulate", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

describe("public simulation gate", () => {
  it("keeps signed-out compute closed by default", async () => {
    const response = await refuseSignedOutSimulation(post({ operation: "run" }), {});
    expect(response?.status).toBe(401);
  });

  it("keeps capability discovery open", async () => {
    const response = await refuseSignedOutSimulation(
      post({ operation: "capabilities" }),
      {},
    );
    expect(response).toBeNull();
  });

  it("allows anonymous compute when the deployment opts in", async () => {
    const response = await refuseSignedOutSimulation(post({ operation: "run" }), {
      PUBLIC_SIMULATION: "true",
    });
    expect(response).toBeNull();
  });

  it("rejects the native preview profile on the anonymous path", async () => {
    const response = await refuseSignedOutSimulation(
      post({
        operation: "run",
        environment: { profileId: "vacask-sky130-candidate" },
      }),
      {
        PUBLIC_SIMULATION: "true",
        VACASK_PROFILE_ID: "vacask-sky130-candidate",
      },
    );
    expect(response?.status).toBe(403);
  });

  it("rate limits anonymous starts per address", async () => {
    const response = await refuseSignedOutSimulation(
      post({ operation: "run" }, { "cf-connecting-ip": "203.0.113.7" }),
      {
        PUBLIC_SIMULATION: "true",
        SIMULATION_RATE_LIMITER: {
          limit: async () => ({ success: false }),
        },
      },
    );
    expect(response?.status).toBe(429);
    expect(response?.headers.get("retry-after")).toBe("60");
  });

  it("falls back to the general API limiter when no simulation binding exists", async () => {
    const response = await refuseSignedOutSimulation(
      post({ operation: "run" }, { "cf-connecting-ip": "203.0.113.8" }),
      {
        PUBLIC_SIMULATION: "true",
        API_RATE_LIMITER: { limit: async () => ({ success: false }) },
      },
    );
    expect(response?.status).toBe(429);
  });
});
