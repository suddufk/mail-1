import { Button } from '@heroui/react';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
      <div className="text-5xl font-semibold">404</div>
      <Button onPress={() => navigate('/inbox')}>Home</Button>
    </div>
  );
}
