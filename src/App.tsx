import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";

interface TestForm {
  name: string;
  message: string;
}

function App() {
  const [response, setResponse] = useState<string>("");
  const { register, handleSubmit } = useForm<TestForm>();

  const onSubmit = async (data: TestForm) => {
    try {
      // Rust의 test_connection 커맨드를 호출합니다.
      const res = await invoke<string>("test_connection", {
        name: data.name,
        message: data.message,
      });
      setResponse(res);
    } catch (error) {
      console.error(error);
      setResponse("Error connecting to backend");
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-background text-foreground">
      <div className="w-full max-w-md space-y-8 bg-card p-6 rounded-lg border shadow-sm">
        <h1 className="text-2xl font-bold text-center">Connection Test</h1>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <input
              {...register("name")}
              className="w-full p-2 rounded bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Your name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Message</label>
            <textarea
              {...register("message")}
              className="w-full p-2 rounded bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Enter message for Rust backend"
              rows={3}
              required
            />
          </div>

          <Button type="submit" className="w-full">
            Send to Backend
          </Button>
        </form>

        {response && (
          <div className="mt-6 p-4 rounded bg-muted border border-border">
            <p className="text-sm font-semibold mb-1 text-foreground">Backend Response:</p>
            <p className="text-sm italic text-foreground/80">"{response}"</p>
          </div>
        )}
      </div>
    </main>
  );
}

export default App;
