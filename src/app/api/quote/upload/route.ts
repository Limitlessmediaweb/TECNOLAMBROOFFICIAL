import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { MAX_FILE_BYTES, isAcceptedFile, isModelFile } from "@/lib/quote-schema";
import { clientIp, rateLimited, sameOrigin } from "@/lib/rate-limit";

/** Tipi MIME accettati: formati CAD e PDF, più il generico che i browser usano per DWG, STEP, IGES. */
const CONTENT_TYPES = [
  "application/pdf",
  "application/octet-stream",
  "application/step",
  "model/step",
  "application/iges",
  "model/iges",
  "model/stl",
  "application/sla",
  "application/vnd.ms-pki.stl",
  "application/acad",
  "image/vnd.dwg",
  "application/dxf",
  "image/vnd.dxf",
  // modelli 3D dei pezzi configurati (GLB)
  "model/gltf-binary",
];

/**
 * POST /api/quote/upload — token per caricare dal browser su Vercel Blob i file più grandi
 * del limite di una funzione Vercel (4,5 MB). Attivo solo se BLOB_READ_WRITE_TOKEN è impostato
 * (Vercel → Storage → Blob). Senza, risponde 501 e il client chiede di mandare i file per email.
 */
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ error: "notConfigured" }, { status: 501 });
  try {
    const body = (await request.json()) as HandleUploadBody;
    // Richiesta del token: solo dalle pagine del sito, al massimo 20 file per IP ogni ora (best effort).
    // La notifica di fine caricamento arriva invece dai server di Vercel, firmata: la verifica handleUpload.
    if (body.type === "blob.generate-client-token") {
      if (!sameOrigin(request)) return Response.json({ error: "forbidden" }, { status: 403 });
      if (rateLimited("upload", clientIp(request), 20, 60 * 60 * 1000)) return Response.json({ error: "rateLimited" }, { status: 429 });
    }
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!(isAcceptedFile(pathname) || isModelFile(pathname)) || !pathname.startsWith("richieste/")) throw new Error("Formato non accettato");
        return { maximumSizeInBytes: MAX_FILE_BYTES, addRandomSuffix: true, allowedContentTypes: CONTENT_TYPES };
      },
      onUploadCompleted: async ({ blob }) => {
        console.info("[quote] file caricato su Blob", blob.pathname);
      },
    });
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
}
