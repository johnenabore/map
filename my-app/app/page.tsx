import CrossedSwords from "./crossed-swords";
import MapViewer from "./map-viewer";

export default function Home() {
  return (
    <main>
      <MapViewer />

      <div className="site-title pointer-events-none fixed left-1/2 top-[4%] z-35 flex -translate-x-1/2 flex-col items-center">
        <CrossedSwords className="mb-[0.3vw] h-[max(1rem,1.5vw)] w-[max(1rem,1.5vw)]" />
        <h1 className="font-display pl-[0.3em] text-[clamp(1rem,1.5vw,2rem)] font-semibold leading-none tracking-[0.3em]">
          PROTHEKA
        </h1>
        <span className="mt-[0.4vw] h-px w-[110%] bg-current opacity-70" />
      </div>
    </main>
  );
}
