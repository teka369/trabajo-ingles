import { createFileRoute } from "@tanstack/react-router";
import { BloomRush } from "@/components/bloom-rush";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <BloomRush />;
}