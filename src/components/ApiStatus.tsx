import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

export const ApiStatus = () => {
  const [status, setStatus] = useState<"success" | "error">("success");

  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Cette fonction serait connectée à votre vraie API
        setStatus("success");
      } catch {
        setStatus("error");
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ul className="fixed top-5 right-5 z-[1000] max-w-[300px] list-none md:top-5 md:right-5 md:max-w-[300px] mobile:top-2.5 mobile:right-2.5 mobile:max-w-[250px]">
      <li
        className={`relative flex justify-between items-center gap-4 overflow-hidden p-2.5 px-4 rounded-md shadow-[rgba(111,111,111,0.2)_0px_8px_24px] transition-all duration-250 mobile:p-2 mobile:px-3 ${
          status === "success"
            ? "bg-[#7dffbc] text-[#047857]"
            : "bg-[#ff7e7e] text-[#7f1d1d]"
        }`}
        style={{
          backgroundImage: `linear-gradient(0deg, transparent 23%, ${
            status === "success"
              ? "rgba(16, 185, 129, 0.25)"
              : "rgba(239, 68, 68, 0.25)"
          } 24%, ${
            status === "success"
              ? "rgba(16, 185, 129, 0.25)"
              : "rgba(239, 68, 68, 0.25)"
          } 25%, transparent 26%, transparent 73%, ${
            status === "success"
              ? "rgba(16, 185, 129, 0.25)"
              : "rgba(239, 68, 68, 0.25)"
          } 74%, ${
            status === "success"
              ? "rgba(16, 185, 129, 0.25)"
              : "rgba(239, 68, 68, 0.25)"
          } 75%, transparent 76%, transparent), linear-gradient(90deg, transparent 23%, ${
            status === "success"
              ? "rgba(16, 185, 129, 0.25)"
              : "rgba(239, 68, 68, 0.25)"
          } 24%, ${
            status === "success"
              ? "rgba(16, 185, 129, 0.25)"
              : "rgba(239, 68, 68, 0.25)"
          } 25%, transparent 26%, transparent 73%, ${
            status === "success"
              ? "rgba(16, 185, 129, 0.25)"
              : "rgba(239, 68, 68, 0.25)"
          } 74%, ${
            status === "success"
              ? "rgba(16, 185, 129, 0.25)"
              : "rgba(239, 68, 68, 0.25)"
          } 75%, transparent 76%, transparent)`,
          backgroundSize: "55px 55px",
        }}
      >
        <div className="flex justify-start items-center gap-2">
          <div className="w-4 h-4">
            <CheckCircle2 className="w-full h-full" />
          </div>
          <div className="text-xs select-none mobile:text-[0.7em]">
            {status === "success" ? "API en ligne" : "API hors ligne"}
          </div>
        </div>
      </li>
    </ul>
  );
};
