declare module "components/common/ConfirmDialog" {
  import type { FC, ReactNode } from "react";

  export interface ConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    title: string;
    message: ReactNode;
    confirmLabel: string;
    cancelLabel?: string;
    onConfirm: () => void | Promise<void>;
    loading?: boolean;
    confirmColor?:
      | "primary"
      | "secondary"
      | "error"
      | "warning"
      | "info"
      | "success"
      | "inherit";
    onExited?: () => void;
  }

  const ConfirmDialog: FC<ConfirmDialogProps>;
  export default ConfirmDialog;
}
