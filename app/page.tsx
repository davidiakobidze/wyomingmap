import Explorer from "@/components/Explorer";
import { places } from "@/lib/places";

export default function Home() {
  return <Explorer places={places} />;
}
