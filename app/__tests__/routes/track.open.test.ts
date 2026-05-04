import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("~/db.server", () => ({
  default: {
    supplierEmail: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  },
}));

import db from "~/db.server";
import { loader } from "~/routes/track.open.$messageId";

const mockDb = db as unknown as {
  supplierEmail: { updateMany: ReturnType<typeof vi.fn> };
};

function makeRequest(messageId?: string) {
  const url = messageId
    ? `http://localhost/track/open/${messageId}`
    : "http://localhost/track/open/";
  return new Request(url);
}

describe("track.open.$messageId loader", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a 200 GIF response", async () => {
    const response = await loader({
      request: makeRequest("msg-1"),
      params: { messageId: "msg-1" },
      context: {},
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/gif");
  });

  it("includes all required no-cache headers", async () => {
    const response = await loader({
      request: makeRequest("msg-1"),
      params: { messageId: "msg-1" },
      context: {},
    });
    expect(response.headers.get("Cache-Control")).toBe(
      "no-store, no-cache, must-revalidate",
    );
    expect(response.headers.get("Pragma")).toBe("no-cache");
    expect(response.headers.get("Expires")).toBe("0");
  });

  it("calls updateMany with opened:false guard (idempotent)", async () => {
    await loader({
      request: makeRequest("msg-1"),
      params: { messageId: "msg-1" },
      context: {},
    });

    expect(mockDb.supplierEmail.updateMany).toHaveBeenCalledWith({
      where: { id: "msg-1", opened: false },
      data: { opened: true, openedAt: expect.any(Date) },
    });
  });

  it("is idempotent — second open of same message does not re-fire (count:0 is fine)", async () => {
    mockDb.supplierEmail.updateMany.mockResolvedValueOnce({ count: 0 });
    const response = await loader({
      request: makeRequest("msg-1"),
      params: { messageId: "msg-1" },
      context: {},
    });
    // Still returns 200 — the pixel must always load
    expect(response.status).toBe(200);
  });

  it("returns GIF even when messageId param is missing", async () => {
    const response = await loader({
      request: makeRequest(),
      params: {},
      context: {},
    });
    expect(response.status).toBe(200);
    expect(mockDb.supplierEmail.updateMany).not.toHaveBeenCalled();
  });
});
