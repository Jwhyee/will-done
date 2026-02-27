import { invoke as tauriInvoke } from "@tauri-apps/api/core";

/**
 * A wrapper for Tauri's invoke that safely handles non-Tauri environments (like a web browser)
 * by providing meaningful logs and preventing crashes.
 */
export async function invoke<T>(command: string, args?: Record<string, any>): Promise<T> {
  // Check if we are running in a Tauri environment
  const isTauri = typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__;

  if (isTauri) {
    try {
      return await tauriInvoke<T>(command, args);
    } catch (error) {
      console.error(`Tauri invoke error [${command}]:`, error);
      throw error;
    }
  } else {
    console.warn(`Browser environment detected. Mocking Tauri command: ${command}`, args);
    
    // Mock implementations for development in browser
    if (command === "get_current_workspace") {
      // Simulate no workspace for onboarding flow, or return a mock if needed
      return null as any; 
    }
    
    if (command === "setup_workspace") {
      return 1 as any; // Mock workspace ID
    }
    
    if (command === "get_timeline") {
      return [] as any;
    }

    if (command === "get_greeting") {
      return `Hello (Browser Mock), ${args?.nickname || "User"}!` as any;
    }

    throw new Error(`Command "${command}" not implemented in browser mock.`);
  }
}
