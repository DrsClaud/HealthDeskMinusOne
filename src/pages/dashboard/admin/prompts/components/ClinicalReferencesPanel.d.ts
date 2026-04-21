import type { FC } from "react";

export type ClinicalReferenceRow = {
  id: string;
  fileName?: string;
  source?: string;
  specialty?: string;
  documentType?: string;
  createdAt?: string | Date;
  isPending?: boolean;
};

export type ClinicalReferencesPanelProps = {
  disabled?: boolean;
  /** When set, skips remote listing and shows these rows (e.g. Storybook). */
  references?: ClinicalReferenceRow[];
};

declare const ClinicalReferencesPanel: FC<ClinicalReferencesPanelProps>;
export default ClinicalReferencesPanel;
