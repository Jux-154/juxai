import { CheckCircle2, AlertCircle } from "lucide-react";
import { useApiStatus } from "@/hooks/useApiStatus";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const ApiStatus = () => {
  const { status } = useApiStatus();
  const [isVisible, setIsVisible] = useState(true);
  const [displayStatus, setDisplayStatus] = useState<"online" | "offline">(status);
  const [key, setKey] = useState(0);

  useEffect(() => {
    // Quand le statut change, show le badge avec animation
    if (status !== displayStatus) {
      setDisplayStatus(status);
      setIsVisible(true);
      setKey(prev => prev + 1); // Force une nouvelle animation
    }
  }, [status, displayStatus]);

  useEffect(() => {
    if (!isVisible) return;

    // Après 5 secondes, commence le fade out
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, [isVisible, key]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.ul
          key={key}
          className="fixed top-5 right-5 z-[1000] max-w-[300px] list-none md:top-5 md:right-5 md:max-w-[300px] mobile:top-2.5 mobile:right-2.5 mobile:max-w-[250px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <li
            className={`relative flex justify-between items-center gap-4 overflow-hidden p-2.5 px-4 rounded-md shadow-[rgba(111,111,111,0.2)_0px_8px_24px] transition-all duration-250 mobile:p-2 mobile:px-3 ${
              displayStatus === "online"
                ? "bg-[#7dffbc] text-[#047857]"
                : "bg-[#ff7e7e] text-[#7f1d1d]"
            }`}
            style={{
              backgroundImage: `linear-gradient(0deg, transparent 23%, ${
                displayStatus === "online"
                  ? "rgba(16, 185, 129, 0.25)"
                  : "rgba(239, 68, 68, 0.25)"
              } 24%, ${
                displayStatus === "online"
                  ? "rgba(16, 185, 129, 0.25)"
                  : "rgba(239, 68, 68, 0.25)"
              } 25%, transparent 26%, transparent 73%, ${
                displayStatus === "online"
                  ? "rgba(16, 185, 129, 0.25)"
                  : "rgba(239, 68, 68, 0.25)"
              } 74%, ${
                displayStatus === "online"
                  ? "rgba(16, 185, 129, 0.25)"
                  : "rgba(239, 68, 68, 0.25)"
              } 75%, transparent 76%, transparent), linear-gradient(90deg, transparent 23%, ${
                displayStatus === "online"
                  ? "rgba(16, 185, 129, 0.25)"
                  : "rgba(239, 68, 68, 0.25)"
              } 24%, ${
                displayStatus === "online"
                  ? "rgba(16, 185, 129, 0.25)"
                  : "rgba(239, 68, 68, 0.25)"
              } 25%, transparent 26%, transparent 73%, ${
                displayStatus === "online"
                  ? "rgba(16, 185, 129, 0.25)"
                  : "rgba(239, 68, 68, 0.25)"
              } 74%, ${
                displayStatus === "online"
                  ? "rgba(16, 185, 129, 0.25)"
                  : "rgba(239, 68, 68, 0.25)"
              } 75%, transparent 76%, transparent)`,
              backgroundSize: "55px 55px",
            }}
          >
            <div className="flex justify-start items-center gap-2">
              <div className="w-4 h-4">
                {displayStatus === "online" ? (
                  <CheckCircle2 className="w-full h-full" />
                ) : (
                  <AlertCircle className="w-full h-full" />
                )}
              </div>
              <div className="text-xs select-none mobile:text-[0.7em]">
                {displayStatus === "online" ? "En ligne" : "Indisponible"}
              </div>
            </div>
          </li>
        </motion.ul>
      )}
    </AnimatePresence>
  );
};
