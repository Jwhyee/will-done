import { useState, useEffect, useCallback } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";

function App() {
  const [hasWorkspace, setHasWorkspace] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const location = useLocation();

  const checkWorkspace = useCallback(async () => {
    try {
      console.log("App: Checking workspace status...");
      const workspace = await invoke("get_current_workspace");
      console.log("App: Workspace check result:", workspace);
      setHasWorkspace(!!workspace);
    } catch (e) {
      console.error("App: Failed to check workspace:", e);
      setHasWorkspace(false);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkWorkspace();
  }, [checkWorkspace]);

  // Re-check when landing on /home to ensure it wasn't just created
  useEffect(() => {
    if (location.pathname === "/home" && hasWorkspace === false) {
      console.log("App: Path changed to /home but hasWorkspace is false. Re-checking...");
      checkWorkspace();
    }
  }, [location.pathname, hasWorkspace, checkWorkspace]);

  if (isChecking && hasWorkspace === null) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-zinc-800 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/" 
        element={
          hasWorkspace === true ? <Navigate to="/home" replace /> : <Onboarding />
        } 
      />
      <Route 
        path="/home" 
        element={
          hasWorkspace === false ? (isChecking ? <div>Checking...</div> : <Navigate to="/" replace />) : <Home />
        } 
      />
    </Routes>
  );
}

export default App;
