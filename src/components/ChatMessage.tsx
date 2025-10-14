import * as React from "react";
import { cn } from "@/lib/utils";
import { Bot, User, Volume2, StopCircle, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { SourcesButton } from "./SourcesButton";
import { Button } from "@/components/ui/button";

// Custom component for code blocks with copy button
const CodeBlockWithCopy = ({ children, language, ...props }: any) => {
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = children;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Truncate display text if too long, but keep full text for copying
  const maxDisplayLength = 800;
  let displayText = children;
  if (children.length > maxDisplayLength) {
    const truncated = children.substring(0, maxDisplayLength);
    const lastNewline = truncated.lastIndexOf('\n');
    if (lastNewline > 0) {
      displayText = truncated.substring(0, lastNewline) + '\n...';
    } else {
      displayText = truncated + '...';
    }
  }

  return (
    <div className="relative w-full max-w-full overflow-hidden">
      <Button
        variant="ghost"
        size="sm"
        onClick={copyToClipboard}
        className="absolute top-2 right-2 h-6 w-6 p-0 bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground z-10"
        title="Copier le code"
      >
        {copied ? (
          <Check className="h-3 w-3" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </Button>
      <div className="w-full max-w-full">
        <SyntaxHighlighter
          style={oneDark}
          language={language}
          PreTag="div"
          className="w-full max-w-full"
          customStyle={{
            whiteSpace: 'nowrap',
            overflowX: 'hidden',
            textOverflow: 'ellipsis',
            display: 'block',
            maxWidth: '100%',
            paddingRight: '1rem',
          }}
          onClick={(e) => {
            const el = e.currentTarget;
            el.style.overflowX = el.style.overflowX === 'auto' ? 'hidden' : 'auto';
          }}
          {...props}
        >
          {displayText}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

interface MessageContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  date?: string;
  score?: number;
}

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string | MessageContent[];
  searchResults?: SearchResult[];
}

export const ChatMessage = ({ role, content, searchResults }: ChatMessageProps) => {
  const isUser = role === "user";
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        // Stop speaking
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      } else {
        // Start speaking
        const utterance = new SpeechSynthesisUtterance(text);

        // Get available voices
        const voices = window.speechSynthesis.getVoices();

        // Try to find the best French voice available
        let bestVoice = null;

        // Priority 1: High-quality French voices
        bestVoice = voices.find(voice =>
          voice.lang.startsWith('fr') &&
          (voice.name.toLowerCase().includes('alice') ||
           voice.name.toLowerCase().includes('amelie') ||
           voice.name.toLowerCase().includes('audrey') ||
           voice.name.toLowerCase().includes('aurore') ||
           voice.name.toLowerCase().includes('claire') ||
           voice.name.toLowerCase().includes('marie') ||
           voice.name.toLowerCase().includes('sophie') ||
           voice.name.toLowerCase().includes('virginie'))
        );

        // Priority 2: Any female French voice
        if (!bestVoice) {
          bestVoice = voices.find(voice =>
            voice.lang.startsWith('fr') &&
            (voice.name.toLowerCase().includes('female') ||
             voice.name.toLowerCase().includes('femme') ||
             voice.name.toLowerCase().includes('woman'))
          );
        }

        // Priority 3: Any French voice
        if (!bestVoice) {
          bestVoice = voices.find(voice => voice.lang.startsWith('fr'));
        }

        // Priority 4: French Canadian voices
        if (!bestVoice) {
          bestVoice = voices.find(voice => voice.lang === 'fr-CA');
        }

        if (bestVoice) {
          utterance.voice = bestVoice;
        } else {
          utterance.lang = 'fr-FR'; // Fallback
        }

        // Optimized settings for natural French speech
        utterance.rate = 0.8; // Slower for better comprehension
        utterance.pitch = 1.15; // Higher pitch for more natural female voice
        utterance.volume = 1.0; // Full volume for clarity

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
      }
    } else {
      alert('La synthèse vocale n\'est pas supportée par votre navigateur.');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    }
  };

  const getTextContent = () => {
    if (typeof content === "string") {
      return content;
    }
    // Extract text from array content
    return content
      .filter(part => part.type === "text" && part.text)
      .map(part => part.text)
      .join(" ");
  };

  const formatContent = () => {
    if (typeof content === "string") {
      return (
        <div className="prose prose-sm max-w-none prose-invert prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground">
          <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || "");
                return !inline && match ? (
                  <CodeBlockWithCopy
                    language={match[1]}
                    {...props}
                  >
                    {String(children).replace(/\n$/, "")}
                  </CodeBlockWithCopy>
                ) : (
                  <code className={cn("px-1.5 py-0.5 rounded bg-muted text-primary font-mono text-sm", className)} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      );
    }

    // Handle array content (text + image)
    return (
      <div className="space-y-2">
        {content.map((part, index) => {
          if (part.type === "text" && part.text) {
            return (
              <div key={index} className="prose prose-sm max-w-none prose-invert prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground">
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || "");
                      return !inline && match ? (
                        <CodeBlockWithCopy
                          language={match[1]}
                          {...props}
                        >
                          {String(children).replace(/\n$/, "")}
                        </CodeBlockWithCopy>
                      ) : (
                        <code className={cn("px-1.5 py-0.5 rounded bg-muted text-primary font-mono text-sm", className)} {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {part.text}
                </ReactMarkdown>
              </div>
            );
          }
          if (part.type === "image_url" && part.image_url?.url) {
            return (
              <img
                key={index}
                src={part.image_url.url}
                alt="Image téléversée"
                className="max-w-full rounded-lg"
              />
            );
          }
          return null;
        })}
      </div>
    );
  };

  return (
    <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          isUser
            ? "bg-primary text-background"
            : "bg-gradient-to-r from-primary to-secondary text-background"
        )}
      >
        {isUser ? (
          <User className="h-5 w-5" />
        ) : (
          <img
            src="https://i.ibb.co/Kzs6bzhM/Jux.jpg"
            alt="Jux"
            className="w-8 h-8 rounded-lg object-cover"
          />
        )}
      </div>
      <div className="flex-1 space-y-2">
        {formatContent()}
        {!isUser && (
          <div className="flex items-center gap-2 mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => speakText(getTextContent())}
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
              title={isSpeaking ? "Arrêter la lecture" : "Écouter la réponse"}
            >
              {isSpeaking ? (
                <StopCircle className="h-4 w-4 mr-1" />
              ) : (
                <Volume2 className="h-4 w-4 mr-1" />
              )}
              {isSpeaking ? "Arrêter" : "Écouter"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(getTextContent())}
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
              title="Copier la réponse"
            >
              {copied ? (
                <Check className="h-4 w-4 mr-1" />
              ) : (
                <Copy className="h-4 w-4 mr-1" />
              )}
              {copied ? "Copié" : "Copier"}
            </Button>
            {searchResults && searchResults.length > 0 && (
              <SourcesButton sources={searchResults} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
