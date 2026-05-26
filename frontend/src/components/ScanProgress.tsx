import React, { useState } from "react";
import { useSocket } from "../hooks/useSocket";
import { useDashboard } from "../hooks/useDashboard";

interface ScanProgressProps {
  room: string;
}

export const ScanProgress: React.FC<ScanProgressProps> = ({ room }) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Initializing...");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const dashboard = useDashboard();

  const { isConnected } = useSocket({
    room,
    onProgress: (data) => {
      setProgress(data.progress);
      setStatus(data.status);
    },
    onComplete: (data) => {
      setProgress(100);
      setStatus("Analysis Complete");
      setResult(data);
      
      // Update global dashboard state to show the results panel!
      setTimeout(() => {
        dashboard.setAnalysisResult(data);
        dashboard.setAnalysisState({
          status: "success",
          error: "",
          targetRepositoryId: dashboard.selectedRepositoryId,
          jobStatus: null,
        });
      }, 1500); // Wait a short moment so user can see "100%" before it disappears
    },
    onError: (data) => {
      setError(data.message || "An error occurred during scanning");
      setStatus("Error");
    },
  });

  return (
    <div className="p-4 border rounded shadow-sm bg-white dark:bg-gray-800">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200">
          Scan Progress
          {!isConnected && <span className="ml-2 text-xs text-red-500">(Disconnected)</span>}
        </h3>
      </div>
      
      <div className="flex justify-between text-xs mb-2">
        <span className="font-medium text-slate-400">Status: {status}</span>
        <span className="font-mono text-slate-500">{progress}%</span>
      </div>
      
      <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner mb-4">
        <div 
          className="h-full bg-blue-500 transition-all duration-500 ease-out"
          style={{ 
            width: `${progress}%`,
            boxShadow: "0 0 10px rgba(59,130,246,0.5)"
          }}
        />
      </div>

      {progress === 100 && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mt-2">
          <p className="text-emerald-400 font-medium">Successfully analyzed! See results below.</p>
        </div>
      )}

      {error && (
        <div className="mt-2 p-2 bg-red-100 text-red-700 text-sm rounded">
          {error}
        </div>
      )}


    </div>
  );
};
