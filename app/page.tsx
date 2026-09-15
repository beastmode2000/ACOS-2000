import AtlasApp from "./components/AtlasApp";
import AtlasBootGate from "./components/AtlasBootGate";

export default function Page() {
  return (
    <AtlasBootGate>
      <AtlasApp />
    </AtlasBootGate>
  );
}
