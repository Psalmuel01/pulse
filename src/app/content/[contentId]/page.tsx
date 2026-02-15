import { ContentViewerClient } from "@/components/content-viewer-client";
import { PrivyAuthGate } from "@/components/privy-auth-gate";

export default function ContentPage({ params }: { params: { contentId: string } }) {
  return (
    <PrivyAuthGate title="View Content" description="Create an account to access unlocked content.">
      <ContentViewerClient contentId={decodeURIComponent(params.contentId)} />
    </PrivyAuthGate>
  );
}

