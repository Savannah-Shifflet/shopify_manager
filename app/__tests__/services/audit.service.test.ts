import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("~/db.server", () => ({
  default: {
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import db from "~/db.server";
import { logAction, getAuditLog } from "~/services/audit.service";

const mockDb = db as unknown as {
  auditLog: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe("audit.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("logAction", () => {
    it("writes a row with shopDomain, action, entityType, entityId and stringified metadata", async () => {
      mockDb.auditLog.create.mockResolvedValueOnce({});
      await logAction("shop1.myshopify.com", "ai.accepted", "product", "p1", {
        field: "title",
      });

      expect(mockDb.auditLog.create).toHaveBeenCalledWith({
        data: {
          shopDomain: "shop1.myshopify.com",
          action: "ai.accepted",
          entityType: "product",
          entityId: "p1",
          metadata: JSON.stringify({ field: "title" }),
        },
      });
    });

    it("defaults metadata to an empty object serialized as '{}'", async () => {
      mockDb.auditLog.create.mockResolvedValueOnce({});
      await logAction("shop1.myshopify.com", "email.sent", "supplier", "s1");

      expect(mockDb.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ metadata: "{}" }),
      });
    });

    it("never throws when the DB write fails", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockDb.auditLog.create.mockRejectedValueOnce(new Error("db down"));

      await expect(
        logAction("shop1.myshopify.com", "x", "y", "z"),
      ).resolves.toBeUndefined();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("getAuditLog", () => {
    it("filters by shopDomain, entityType, entityId and orders by createdAt desc with default limit 50", async () => {
      mockDb.auditLog.findMany.mockResolvedValueOnce([]);
      await getAuditLog("shop1.myshopify.com", "product", "p1");

      expect(mockDb.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          shopDomain: "shop1.myshopify.com",
          entityType: "product",
          entityId: "p1",
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    });

    it("respects a custom limit", async () => {
      mockDb.auditLog.findMany.mockResolvedValueOnce([]);
      await getAuditLog("shop1.myshopify.com", "product", "p1", 10);

      expect(mockDb.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });
  });
});
