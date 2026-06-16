import { useState } from "react";
import { Globe, CheckCircle2, Loader2, AlertCircle, Rocket, Video } from "lucide-react";
import { publishLanding } from "../lib/api";

interface Props {
  html: string;
  landingId: string;
  ideasCount: number;
  onPublished?: () => void;
}

export default function LandingPreview({ html, landingId, ideasCount, onPublished }: Props) {
  const [publishing, setPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePublish = async () => {
    setPublishing(true);
    setError(null);
    try {
      const res = await publishLanding(landingId);
      setPublishedUrl(res.publishedUrl);
      onPublished?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pubblicazione fallita");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 border-b border-border flex items-center gap-2 text-xs text-muted-foreground">
        <Video className="w-3.5 h-3.5" />
        {ideasCount} idee social generate
      </div>

      <div className="flex-1 min-h-0 bg-white">
        <iframe
          title="Anteprima landing"
          srcDoc={html}
          className="w-full h-full border-0"
          sandbox="allow-same-origin"
        />
      </div>

      <div className="p-6 border-t border-border bg-background/80 backdrop-blur-md">
        {error && (
          <div className="mb-3 flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {publishedUrl ? (
          <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-semibold">
            <CheckCircle2 className="w-5 h-5" />
            Landing pubblicata
          </div>
        ) : (
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold transition-colors"
            data-testid="btn-publish-landing"
          >
            {publishing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Pubblicazione...
              </>
            ) : (
              <>
                <Rocket className="w-5 h-5" /> Pubblica landing
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
