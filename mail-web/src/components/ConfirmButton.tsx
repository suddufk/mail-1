import { AlertDialog, Button } from '@heroui/react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

type ConfirmButtonProps = {
  children: ReactNode;
  onConfirm: () => Promise<void> | void;
  title?: ReactNode;
  description?: ReactNode;
  confirmText?: ReactNode;
  cancelText?: ReactNode;
  className?: string;
  variant?: any;
  size?: any;
  isIconOnly?: boolean;
  isDisabled?: boolean;
};

export default function ConfirmButton({
  children,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  className,
  variant = 'danger',
  size,
  isIconOnly,
  isDisabled,
}: ConfirmButtonProps) {
  const { t } = useTranslation();
  const [pending, setPending] = useState(false);

  return (
    <AlertDialog>
      <Button
        className={className}
        isDisabled={isDisabled || pending}
        isIconOnly={isIconOnly}
        size={size}
        variant={variant}
      >
        {children}
      </Button>
      <AlertDialog.Backdrop>
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[420px]">
            {({ close }: any) => (
              <>
                <AlertDialog.CloseTrigger />
                <AlertDialog.Header>
                  <AlertDialog.Icon status="danger" />
                  <AlertDialog.Heading>{title || t('deleteConfirmTitle')}</AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body>
                  <p>{description || t('deleteConfirmDescription')}</p>
                </AlertDialog.Body>
                <AlertDialog.Footer>
                  <Button isDisabled={pending} onPress={close} variant="tertiary">
                    {cancelText || t('cancel')}
                  </Button>
                  <Button
                    isDisabled={pending}
                    onPress={async () => {
                      setPending(true);
                      try {
                        await onConfirm();
                        close();
                      } finally {
                        setPending(false);
                      }
                    }}
                    variant="danger"
                  >
                    {confirmText || t('delete')}
                  </Button>
                </AlertDialog.Footer>
              </>
            )}
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}
