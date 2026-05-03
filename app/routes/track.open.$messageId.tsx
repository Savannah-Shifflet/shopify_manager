import type { LoaderFunctionArgs } from "@remix-run/node";
import db from "~/db.server";

// 1×1 transparent GIF
const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

/**
 * Public open-tracking pixel endpoint.
 *
 * Email clients fetch this URL when they render the embedded pixel; we use
 * `updateMany` so already-opened or unknown ids silently no-op rather than
 * surfacing errors to the email client.
 */
export async function loader({ params }: LoaderFunctionArgs) {
  const { messageId } = params;

  if (messageId) {
    db.supplierEmail
      .updateMany({
        where: { id: messageId, opened: false },
        data: { opened: true, openedAt: new Date() },
      })
      .catch((err) =>
        console.error({ messageId, err }, "Open tracking update failed"),
      );
  }

  return new Response(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}
