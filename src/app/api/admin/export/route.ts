import { NextResponse } from "next/server";
import archiver from "archiver";
import { PassThrough } from "node:stream";
import { vaultDir } from "@/lib/config";
import { localDateKey } from "@/lib/utils/date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Data export (spec §6.8 ⑥): zip the whole vault/ for download. */
export async function GET() {
  const archive = archiver("zip", { zlib: { level: 9 } });
  const stream = new PassThrough();
  archive.pipe(stream);
  archive.directory(vaultDir(), "vault");
  void archive.finalize();

  // adapt Node stream → web ReadableStream
  const webStream = new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) => controller.enqueue(chunk));
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
  });

  return new NextResponse(webStream, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="ccbilly-vault-${localDateKey()}.zip"`,
    },
  });
}
