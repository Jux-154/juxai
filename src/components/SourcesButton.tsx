import { Button } from "@/components/ui/button";
import { Globe, ExternalLink, Star, Clock, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  // Trier les sources par score (pertinence)
  const sortedSources = [...sources].sort((a, b) => (b.score || 0) - (a.score || 0));

  // Catégoriser les sources
  const recentSources = sortedSources.filter(source => {
    if (!source.date) return false;
    const sourceDate = new Date(source.date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - sourceDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30; // 30 derniers jours
  });

  const highScoreSources = sortedSources.filter(source => (source.score || 0) > 0.7);

  const getScoreColor = (score?: number) => {
    if (!score) return "text-muted-foreground";
    if (score > 0.8) return "text-green-600";
    if (score > 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreIcon = (score?: number) => {
    if (!score) return null;
    if (score > 0.8) return <Star className="h-3 w-3 fill-current" />;
    if (score > 0.6) return <TrendingUp className="h-3 w-3" />;
    return null;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const SourceCard = ({ source, index }: { source: SearchResult; index: number }) => (
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
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {formatDate(source.date)}
                    </span>
                  </div>
                )}
                {source.score && (
                  <div className={`flex items-center gap-1 ${getScoreColor(source.score)}`}>
                    {getScoreIcon(source.score)}
                    <span className="text-xs font-medium">
                      {(source.score * 100).toFixed(0)}%
                    </span>
                  </div>
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
  );

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
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Sources de recherche ({sources.length})
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" className="text-sm">
              Tous ({sortedSources.length})
            </TabsTrigger>
            <TabsTrigger value="recent" className="text-sm">
              Récent ({recentSources.length})
            </TabsTrigger>
            <TabsTrigger value="relevant" className="text-sm">
              Pertinent ({highScoreSources.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-4">
                {sortedSources.map((source, index) => (
                  <SourceCard key={index} source={source} index={index} />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="recent" className="mt-4">
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-4">
                {recentSources.length > 0 ? (
                  recentSources.map((source, index) => (
                    <SourceCard key={index} source={source} index={index} />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune source récente trouvée</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="relevant" className="mt-4">
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-4">
                {highScoreSources.length > 0 ? (
                  highScoreSources.map((source, index) => (
                    <SourceCard key={index} source={source} index={index} />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune source très pertinente trouvée</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
