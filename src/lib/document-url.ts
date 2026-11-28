import { useEffect, useState } from "react";
import { useOptionalAuth } from "@/lib/auth";

export function isPrivateDocumentUrl(url?: string): boolean {
  if (!url) return false;
  return url.includes("/api/admin/documents/file") || /\.r2\.cloudflarestorage\.com/i.test(url);
}

/**
 * Resolves a stored document URL into a short-lived signed backend proxy URL
 * whenever it points to private Cloudflare R2 storage and the admin is authenticated.
 */
export function useAuthorizedDocumentUrl(fileUrl?: string): string | undefined {
  const auth = useOptionalAuth();
  const status = auth?.status ?? "unauthenticated";
  const apiRequest = auth?.apiRequest;
  const [signedUrl, setSignedUrl] = useState<string | undefined>(() =>
    fileUrl && !isPrivateDocumentUrl(fileUrl) ? fileUrl : undefined,
  );

  useEffect(() => {
    if (!fileUrl) {
      setSignedUrl(undefined);
      return;
    }
    if (
      fileUrl.startsWith("data:") ||
      fileUrl.startsWith("blob:") ||
      fileUrl.includes("sig=") ||
      !isPrivateDocumentUrl(fileUrl)
    ) {
      setSignedUrl(fileUrl);
      return;
    }
    if (status !== "authenticated" || !apiRequest) {
      setSignedUrl(fileUrl);
      return;
    }

    let cancelled = false;
    void apiRequest<{ signedUrl?: string }>("/api/admin/documents/sign", {
      method: "POST",
      body: JSON.stringify({ fileUrl }),
    })
      .then((res) => {
        if (!cancelled && res?.signedUrl) {
          setSignedUrl(res.signedUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSignedUrl(fileUrl);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fileUrl, status, apiRequest]);

  return signedUrl;
}
