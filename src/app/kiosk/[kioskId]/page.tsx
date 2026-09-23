import { UploadView } from '@/components/features/upload';

interface KioskPageProps {
  params: Promise<{
    kioskId: string;
  }>;
}

export default async function KioskPage({ params }: KioskPageProps) {
  const { kioskId } = await params;
  return <UploadView kioskId={kioskId} />;
}