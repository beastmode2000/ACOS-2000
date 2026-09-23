import AtlasApp from "./components/AtlasApp";
import AtlasBootGate from "./components/AtlasBootGate";
import AtlasResumeRecovery from "./components/AtlasResumeRecovery";
import AtlasSaturdayEventPrepSetup from "./components/AtlasSaturdayEventPrepSetup";

export default function Page() {
  return (
    <AtlasBootGate>
      <AtlasResumeRecovery />
      <AtlasSaturdayEventPrepSetup />
      <AtlasApp />
    </AtlasBootGate>
  );
}
