import { ProjectProvider } from "@/context/project-context";
import { StudioShell } from "@/components/studio/studio-shell";

export default function HomePage() {
  return (
    <ProjectProvider>
      <StudioShell />
    </ProjectProvider>
  );
}
