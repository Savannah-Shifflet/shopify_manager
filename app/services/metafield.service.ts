/**
 * Shopify metafield read/write helpers.
 *
 * Content architecture:
 *   custom.*   — merchant-visible, connectable in Theme Editor
 *   $app:*     — internal app state (sync hash, enrichment status, etc.)
 *
 * Never write structured content to body_html — use metafields.
 */

type GraphQLClient = {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
};

const SET_METAFIELDS_MUTATION = `#graphql
  mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        namespace
        key
        value
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const GET_METAFIELDS_QUERY = `#graphql
  query GetProductMetafields($id: ID!, $namespace: String!) {
    product(id: $id) {
      metafields(namespace: $namespace, first: 20) {
        edges {
          node {
            id
            namespace
            key
            value
            type
          }
        }
      }
    }
  }
`;

export interface MetafieldInput {
  ownerId: string; // Shopify GID, e.g. "gid://shopify/Product/123"
  namespace: string;
  key: string;
  value: string;
  type: string; // e.g. "single_line_text_field", "json", "list.single_line_text_field"
}

export async function setMetafields(
  admin: GraphQLClient,
  metafields: MetafieldInput[],
) {
  const response = await admin.graphql(SET_METAFIELDS_MUTATION, {
    variables: { metafields },
  });
  const data = (await response.json()) as {
    data: {
      metafieldsSet: {
        metafields: Array<{
          id: string;
          namespace: string;
          key: string;
          value: string;
        }>;
        userErrors: Array<{ field: string; message: string }>;
      };
    };
  };

  const errors = data.data?.metafieldsSet?.userErrors ?? [];
  if (errors.length > 0) {
    throw new Error(`Metafield errors: ${JSON.stringify(errors)}`);
  }

  return data.data.metafieldsSet.metafields;
}

export async function getProductMetafields(
  admin: GraphQLClient,
  shopifyProductId: string,
  namespace: string,
) {
  const response = await admin.graphql(GET_METAFIELDS_QUERY, {
    variables: { id: shopifyProductId, namespace },
  });
  const data = (await response.json()) as {
    data: {
      product: {
        metafields: {
          edges: Array<{
            node: {
              id: string;
              namespace: string;
              key: string;
              value: string;
              type: string;
            };
          }>;
        };
      };
    };
  };
  return data.data.product.metafields.edges.map((e) => e.node);
}
