import { useVehicles } from "@/hooks/use-vehicles";
import Layout from "@/components/layout";
import { MapView } from "@/components/map-view";

export default function LiveMapPage() {
  const { data: vehicles } = useVehicles();

  return (
    <Layout>
      <div className="h-[calc(100vh-8rem)] rounded-xl overflow-hidden shadow-2xl border border-slate-200">
        <MapView vehicles={vehicles} height="100%" />
      </div>
    </Layout>
  );
}
