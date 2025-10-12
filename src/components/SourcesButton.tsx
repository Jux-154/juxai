import { Button } from "@/components/ui/button";
import { Globe, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  date?: string;
  score?: number;
}

interface SourcesButtonProps {
  sources: SearchResult[];
}

export const SourcesButton = ({ sources }: SourcesButtonProps) => {
  if (!sources || sources.length === 0) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-sm mt-3 bg-background/50 hover:bg-background/80 border-primary/20"
        >
          <Globe className="h-4 w-4" />
          <span>Sources</span>
          <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
            {sources.length}
          </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-xl">Liens</DialogTitle>
        </DialogHeader>
        <div className="border-b border-border mb-4">
          <h3 className="text-sm font-medium text-muted-foreground pb-3">Citations</h3>
        </div>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-4">
            {sources.map((source, index) => (
              <a
                key={index}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors group"
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Globe className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground font-medium">
                            {new URL(source.url).hostname.replace('www.', '')}
                          </span>
                          {source.date && (
                            <span className="text-xs text-muted-foreground">
                              • {source.date}
                            </span>
                          )}
                        </div>
                        <h4 className="font-semibold text-sm text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                          {source.title}
                        </h4>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {source.snippet}
                    </p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
