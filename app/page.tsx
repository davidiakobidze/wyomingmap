import Explorer from "@/components/Explorer";
import { projects } from "@/lib/projects";

export default function Home() {
  return <Explorer projects={projects} />;
}
