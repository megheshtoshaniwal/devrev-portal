"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { Providers } from "@/components/providers";
import { useSession } from "@/devrev-sdk/hooks/use-session";

function CallbackContent() {
  // The session hook handles the Auth0 callback automatically
  // when it detects code= and state= in the URL
  const { loading, error } = useSession();
  const params = useParams();
  const basePath = `/${params.locale}/${params.portalSlug}`;

  useEffect(() => {
    // The useSession hook will handle the callback and redirect
    // This page just shows a loading state
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3">
      {error ? (
        <>
          <p className="text-sm text-destructive">{error}</p>
          <a href={`${basePath}/login`} className="text-sm text-primary hover:underline">
            Try again
          </a>
        </>
      ) : (
        <>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Signing you in...</p>
        </>
      )}
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Providers>
      <CallbackContent />
    </Providers>
  );
}
