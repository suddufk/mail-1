import { Button, Drawer } from '@heroui/react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type SideDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  widthClass?: string;
};

export default function SideDrawer({
  open,
  onOpenChange,
  title,
  children,
  footer,
  widthClass = 'sm:max-w-[520px]',
}: SideDrawerProps) {
  const { t } = useTranslation();

  return (
    <Drawer.Backdrop isOpen={open} onOpenChange={onOpenChange} variant="blur">
      <Drawer.Content placement="right">
        <Drawer.Dialog className={`h-full w-full ${widthClass}`}>
          <Drawer.CloseTrigger />
          <Drawer.Header>
            <Drawer.Heading>{title}</Drawer.Heading>
          </Drawer.Header>
          <Drawer.Body>{children}</Drawer.Body>
          <Drawer.Footer>
            {footer || (
              <Button slot="close" variant="secondary">
                {t('close')}
              </Button>
            )}
          </Drawer.Footer>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  );
}
