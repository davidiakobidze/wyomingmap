import MapCanvas from "@/components/MapCanvas";

export default function Home() {
  return (
    <div className="shell">
      <header className="topbar">
        <a className="brand" href="/">Wyoming Map</a>
        <span className="tagline">One view to understand Wyoming.</span>
      </header>
      <div className="mapwrap">
        <MapCanvas />
      </div>
    </div>
  );
}
