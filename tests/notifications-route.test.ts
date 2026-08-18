import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/notifications/route";

describe("GET /api/notifications", () => {
  it("returns six pending mock review notifications", async () => {
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.pendingCount).toBe(6);
    expect(body.notifications).toHaveLength(6);
  });
});
