import Explorer from "@/components/Explorer";
import { places } from "@/lib/places";

export default function Home() {
  return (
    <Explorer
      places={places}
      intro={{
        h1: "A curated map of Wyoming",
        text: "The national parks, the drives worth the detour, the spots to stand for the photo, and what is burning right now. Hand-picked, not everything.",
      }}
    />
  );
}
