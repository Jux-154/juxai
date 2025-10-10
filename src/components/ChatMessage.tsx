import * as React from "react";
import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface MessageContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string | MessageContent[];
}

export const ChatMessage = ({ role, content }: ChatMessageProps) => {
  const isUser = role === "user";

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
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, "")}
                  </SyntaxHighlighter>
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
                        <SyntaxHighlighter
                          style={oneDark}
                          PreTag="div"
                          {...props}
                        >
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
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
      <div className="flex-1 space-y-2">{formatContent()}</div>
    </div>
  );
};
