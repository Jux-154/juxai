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
import { motion, AnimatePresence } from "framer-motion";
import { buttonVariants } from "@/lib/animations";

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
    <div className="relative w-full max-w-full overflow-x-auto sm:overflow-hidden flex flex-col">
      <Button
        variant="ghost"
        size="sm"
        onClick={copyToClipboard}
        className="absolute top-1 right-1 sm:top-2 sm:right-2 h-6 w-6 p-0 bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground z-10"
        title="Copier le code"
      >
        {copied ? (
          <Check className="h-3 w-3" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </Button>
      <div className="w-full max-w-full min-w-0">
        <SyntaxHighlighter
          style={oneDark}
          language={language}
          PreTag="div"
          className="w-full max-w-full min-w-0"
          customStyle={{
            whiteSpace: 'pre',
            overflowX: 'auto',
            overflowWrap: 'break-word',
            wordBreak: 'break-all',
            display: 'block',
            minWidth: '100%',
            fontSize: '0.75rem',
            lineHeight: '1.25',
            padding: '1rem',
            paddingRight: '2.5rem',
            borderRadius: '0.375rem',
            margin: '0',
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
    const contentToRender = getTextContent();

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
            {contentToRender}
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
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex gap-4"
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
          delay: 0.1
        }}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          isUser
            ? "bg-primary text-background"
            : "bg-gradient-to-r from-primary to-secondary text-background"
        )}
      >
        {isUser ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 500 }}
          >
            <User className="h-5 w-5" />
          </motion.div>
        ) : (
          <motion.img
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            src="https://i.ibb.co/Kzs6bzhM/Jux.jpg"
            alt="Jux"
            className="w-8 h-8 rounded-lg object-cover"
          />
        )}
      </motion.div>
      <div className="flex-1 space-y-2">
        {formatContent()}
        {!isUser && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="flex items-center gap-2 mt-2"
          >
            <motion.div
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => speakText(getTextContent())}
                className="h-8 px-2 text-muted-foreground hover:text-foreground"
                title={isSpeaking ? "Arrêter la lecture" : "Écouter la réponse"}
              >
                <AnimatePresence mode="wait">
                  {isSpeaking ? (
                    <motion.div
                      key="stop"
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 90 }}
                      transition={{ duration: 0.2 }}
                    >
                      <StopCircle className="h-4 w-4 mr-1" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="play"
                      initial={{ scale: 0, rotate: 90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: -90 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Volume2 className="h-4 w-4 mr-1" />
                    </motion.div>
                  )}
                </AnimatePresence>
                {isSpeaking ? "Arrêter" : "Écouter"}
              </Button>
            </motion.div>
            <motion.div
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(getTextContent())}
                className="h-8 px-2 text-muted-foreground hover:text-foreground"
                title="Copier la réponse"
              >
                <AnimatePresence mode="wait">
                  {copied ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 180 }}
                      transition={{ duration: 0.3, type: "spring" }}
                    >
                      <Check className="h-4 w-4 mr-1" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="copy"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                    </motion.div>
                  )}
                </AnimatePresence>
                {copied ? "Copié" : "Copier"}
              </Button>
            </motion.div>
            {searchResults && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, duration: 0.3 }}
              >
                <SourcesButton sources={searchResults} />
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
