import { Achievement, User } from "@/types";
import { useAchievement } from "./hooks/useAchievement.tsx";
import { AchievementSidebar } from "./components/AchievementSidebar";
import { CreateTabContent } from "./components/CreateTabContent";
import { BrowseTabContent } from "./components/BrowseTabContent";
import { QuotaExhaustedModal } from "./components/QuotaExhaustedModal";
import { DuplicateConfirmModal } from "./components/DuplicateConfirmModal";

interface AchievementViewProps {
  workspaceId: number;
  user: User;
  t: any;
  onClose: () => void;
  onShowSavedAchievement: (retro: Achievement) => void;
}

export const AchievementView = ({
  workspaceId,
  user,
  t,
  onClose,
  onShowSavedAchievement
}: AchievementViewProps) => {
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
    foundAchievement,
    genMessage,
    activeDates,
    availableModels,
    selectedModel,
    setSelectedModel,
    handleGenerate,
    handleConfirmOverwrite,
    handleCopy,
  } = useAchievement({ workspaceId, user, t, onShowSavedAchievement });

  return (
    <div className="flex-1 flex h-screen overflow-hidden bg-background antialiased selection:bg-primary/30 relative">
      <AchievementSidebar 
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
              availableModels={availableModels}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              isFreeUser={user.isFreeUser}
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
              foundAchievement={foundAchievement}
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
