import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";

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
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <p className="text-foreground leading-relaxed whitespace-pre-wrap">
            {content}
          </p>
        </div>
      );
    }

    // Handle array content (text + image)
    return (
      <div className="space-y-2">
        {content.map((part, index) => {
          if (part.type === "text" && part.text) {
            return (
              <div key={index} className="prose prose-sm max-w-none dark:prose-invert">
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                  {part.text}
                </p>
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
