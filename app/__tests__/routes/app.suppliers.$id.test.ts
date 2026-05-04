import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("~/shopify.server", () => ({
  authenticate: {
    admin: vi.fn().mockResolvedValue({
      session: { shop: "test-shop.myshopify.com" },
    }),
  },
}));

vi.mock("~/services/supplier.service", () => ({
  getSupplierById: vi.fn(),
  listProducts: vi.fn(),
  updateSupplier: vi.fn(),
}));

vi.mock("~/services/sequence.service", () => ({
  enrollSupplierInSequence: vi.fn(),
  listSequences: vi.fn(),
}));

import {
  getSupplierById,
  updateSupplier,
} from "~/services/supplier.service";
import { enrollSupplierInSequence } from "~/services/sequence.service";
import { action } from "~/routes/app.suppliers.$id";

const shopDomain = "test-shop.myshopify.com";
const supplierId = "supplier-1";

function makeRequest(body: Record<string, string>) {
  const formData = new FormData();
  for (const [k, v] of Object.entries(body)) formData.append(k, v);
  return new Request(`http://localhost/app/suppliers/${supplierId}`, {
    method: "POST",
    body: formData,
  });
}

const mockedGetSupplier = getSupplierById as ReturnType<typeof vi.fn>;
const mockedUpdateSupplier = updateSupplier as ReturnType<typeof vi.fn>;
const mockedEnroll = enrollSupplierInSequence as ReturnType<typeof vi.fn>;

describe("app.suppliers.$id action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects payloads with no intent (422)", async () => {
    const response = await action({
      request: makeRequest({ body: "stray field" }),
      params: { id: supplierId },
      context: {},
    });
    expect(response.status).toBe(422);
    const json = await response.json();
    expect(json).toHaveProperty("errors");
  });

  it("rejects update with missing required fields (422)", async () => {
    const response = await action({
      request: makeRequest({ intent: "update" }),
      params: { id: supplierId },
      context: {},
    });
    expect(response.status).toBe(422);
  });

  it("update intent calls updateSupplier with parsed fields", async () => {
    mockedUpdateSupplier.mockResolvedValueOnce({});
    const response = await action({
      request: makeRequest({
        intent: "update",
        name: "New Co",
        website: "https://example.com",
        status: "CONTACTED",
      }),
      params: { id: supplierId },
      context: {},
    });
    expect(response.status).toBe(200);
    expect(mockedUpdateSupplier).toHaveBeenCalledWith(shopDomain, supplierId, {
      name: "New Co",
      website: "https://example.com",
      status: "CONTACTED",
    });
  });

  it("add-note intent appends to existing notes array", async () => {
    mockedGetSupplier.mockResolvedValueOnce({
      id: supplierId,
      notes: JSON.stringify([{ body: "old", createdAt: "2026-01-01T00:00:00Z" }]),
    });
    mockedUpdateSupplier.mockResolvedValueOnce({});

    const response = await action({
      request: makeRequest({ intent: "add-note", body: "fresh note" }),
      params: { id: supplierId },
      context: {},
    });
    expect(response.status).toBe(200);

    expect(mockedUpdateSupplier).toHaveBeenCalledTimes(1);
    const [shop, id, data] = mockedUpdateSupplier.mock.calls[0];
    expect(shop).toBe(shopDomain);
    expect(id).toBe(supplierId);
    const parsedNotes = JSON.parse((data as { notes: string }).notes) as Array<{
      body: string;
      createdAt: string;
    }>;
    expect(parsedNotes).toHaveLength(2);
    expect(parsedNotes[0].body).toBe("old");
    expect(parsedNotes[1].body).toBe("fresh note");
    expect(typeof parsedNotes[1].createdAt).toBe("string");
  });

  it("add-note intent works when notes is empty/default", async () => {
    mockedGetSupplier.mockResolvedValueOnce({
      id: supplierId,
      notes: "[]",
    });
    mockedUpdateSupplier.mockResolvedValueOnce({});

    const response = await action({
      request: makeRequest({ intent: "add-note", body: "first" }),
      params: { id: supplierId },
      context: {},
    });
    expect(response.status).toBe(200);

    const [, , data] = mockedUpdateSupplier.mock.calls[0];
    const parsedNotes = JSON.parse((data as { notes: string }).notes) as Array<{
      body: string;
    }>;
    expect(parsedNotes).toHaveLength(1);
    expect(parsedNotes[0].body).toBe("first");
  });

  it("add-note rejects empty body (422)", async () => {
    const response = await action({
      request: makeRequest({ intent: "add-note", body: "" }),
      params: { id: supplierId },
      context: {},
    });
    expect(response.status).toBe(422);
    expect(mockedUpdateSupplier).not.toHaveBeenCalled();
  });

  it("enroll-sequence intent calls enrollSupplierInSequence", async () => {
    mockedEnroll.mockResolvedValueOnce({ id: "ss-1" });

    const response = await action({
      request: makeRequest({
        intent: "enroll-sequence",
        sequenceId: "seq-1",
      }),
      params: { id: supplierId },
      context: {},
    });
    expect(response.status).toBe(200);
    expect(mockedEnroll).toHaveBeenCalledWith(
      shopDomain,
      supplierId,
      "seq-1",
    );
  });

  it("enroll-sequence rejects missing sequenceId (422)", async () => {
    const response = await action({
      request: makeRequest({ intent: "enroll-sequence", sequenceId: "" }),
      params: { id: supplierId },
      context: {},
    });
    expect(response.status).toBe(422);
    expect(mockedEnroll).not.toHaveBeenCalled();
  });
});
