import db from "~/db.server";

export async function listTemplates(shopDomain: string) {
  return db.descriptionTemplate.findMany({
    where: { shopDomain },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
}

export async function getTemplateById(shopDomain: string, id: string) {
  return db.descriptionTemplate.findFirst({ where: { id, shopDomain } });
}

export async function getDefaultTemplate(shopDomain: string) {
  return db.descriptionTemplate.findFirst({
    where: { shopDomain, isDefault: true },
  });
}

export async function createTemplate(
  shopDomain: string,
  data: {
    name: string;
    sections: Array<{ tag: string; title: string; hint: string; required: boolean }>;
    isDefault?: boolean;
    productType?: string;
  },
) {
  return db.descriptionTemplate.create({
    data: {
      shopDomain,
      name: data.name,
      sections: JSON.stringify(data.sections),
      isDefault: data.isDefault ?? false,
      productType: data.productType ?? null,
    },
  });
}

export async function updateTemplate(
  shopDomain: string,
  id: string,
  data: Partial<{ name: string; sections: string; isDefault: boolean; productType: string | null }>,
) {
  return db.descriptionTemplate.update({
    where: { id, shopDomain },
    data,
  });
}

export async function deleteTemplate(shopDomain: string, id: string) {
  return db.descriptionTemplate.delete({ where: { id, shopDomain } });
}
