import { useContext } from "react";
import { PromptsManagerContext } from "context/PromptsManager";

export const usePromptsManager = () => {
  const context = useContext(PromptsManagerContext);

  if (context === undefined) {
    throw new Error(
      "usePromptsManager must be used within a PromptsManagerProvider",
    );
  }

  return context;
};
