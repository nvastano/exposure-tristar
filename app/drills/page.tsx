import { DRILLS } from "@/lib/drills";

export default function DrillsPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-xl font-bold tracking-wide">DRILLS</h2>
        <p className="text-white/50 text-sm mt-1">
          Watch how each drill is done before logging it on the Daily Work tab.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {DRILLS.map((drill) => (
          <div key={drill.key} className="rounded-lg border border-white/10 p-4 flex flex-col gap-3">
            <div className="aspect-video w-full overflow-hidden rounded">
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${drill.youtubeId}`}
                title={drill.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div>
              <span className="font-semibold text-sm">{drill.name}</span>
              {drill.description && (
                <p className="text-white/50 text-xs mt-1">{drill.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
