import { Retrospective, User } from "@/types";
import { useRetrospective } from "./hooks/useRetrospective";
import { RetroSidebar } from "./components/RetroSidebar";
import { CreateTabContent } from "./components/CreateTabContent";
import { BrowseTabContent } from "./components/BrowseTabContent";
import { QuotaExhaustedModal } from "./components/QuotaExhaustedModal";
import { DuplicateConfirmModal } from "./components/DuplicateConfirmModal";

interface RetrospectiveViewProps {
  workspaceId: number;
  user: User;
  t: any;
  onClose: () => void;
  onShowSavedRetro: (retro: Retrospective) => void;
}

export const RetrospectiveView = ({
  workspaceId,
  user,
  t,
  onClose,
  onShowSavedRetro
}: RetrospectiveViewProps) => {
  const {
    tab,
    setTab,
    isGenerating,
    isQuotaExhausted,
    setIsQuotaExhausted,
    isDuplicateConfirmOpen,
    setIsDuplicateConfirmOpen,
    isCopied,
    inputValue,
    setInputValue,
    browseInputValue,
    setBrowseInputValue,
    foundRetro,
    genMessage,
    activeDates,
    handleGenerate,
    handleConfirmOverwrite,
    handleCopy,
  } = useRetrospective({ workspaceId, user, t, onShowSavedRetro });

  return (
    <div className="flex-1 flex h-screen overflow-hidden bg-background antialiased selection:bg-primary/30 relative">
      <RetroSidebar 
        tab={tab} 
        setTab={setTab} 
        onClose={onClose} 
        t={t} 
      />

      <main className="flex-1 overflow-hidden flex flex-col relative z-50">
        <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full space-y-8 pb-32">
          {tab === "create" ? (
            <CreateTabContent
              inputValue={inputValue}
              setInputValue={setInputValue}
              activeDates={activeDates}
              genMessage={genMessage}
              handleGenerate={handleGenerate}
              isGenerating={isGenerating}
              t={t}
            />
          ) : (
            <BrowseTabContent
              browseInputValue={browseInputValue}
              setBrowseInputValue={setBrowseInputValue}
              activeDates={activeDates}
              foundRetro={foundRetro}
              isCopied={isCopied}
              handleCopy={handleCopy}
              t={t}
            />
          )}
        </div>
      </main>

      <QuotaExhaustedModal
        t={t}
        isOpen={isQuotaExhausted}
        onClose={() => setIsQuotaExhausted(false)}
        onRetry={() => {
          setIsQuotaExhausted(false);
          handleGenerate(true);
        }}
      />

      <DuplicateConfirmModal
        t={t}
        isOpen={isDuplicateConfirmOpen}
        onClose={() => setIsDuplicateConfirmOpen(false)}
        onConfirm={handleConfirmOverwrite}
      />
    </div>
  );
};
