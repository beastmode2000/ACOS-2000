import AtlasApp from "./components/AtlasApp";
import AtlasBootGate from "./components/AtlasBootGate";
import AtlasResumeRecovery from "./components/AtlasResumeRecovery";

export default function Page() {
  return (
    <AtlasBootGate>
      <AtlasResumeRecovery />
      <AtlasApp />
    </AtlasBootGate>
  );
}
