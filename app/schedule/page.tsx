const CALENDAR_ID = "2808a6446a55f37a122d29fc0ec8318a90c423e10306263af5c59f8be4c9b71c@group.calendar.google.com";

const EMBED_URL = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(
  CALENDAR_ID
)}&ctz=America%2FChicago&mode=MONTH&showTitle=0&showPrint=0&showCalendars=0&showTz=0`;

const SUBSCRIBE_URL = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(
  CALENDAR_ID
)}`;

export default function SchedulePage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold tracking-wide">Schedule</h1>
        <a
          href={SUBSCRIBE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90 transition-opacity"
        >
          Subscribe to Calendar
        </a>
      </div>
      <p className="text-white/50 text-sm">
        Practices and games will be posted here. Tap &quot;Subscribe to Calendar&quot; to add this
        schedule to your own phone or calendar app so you get updates automatically.
      </p>
      <div className="rounded-lg border border-white/10 overflow-hidden">
        <iframe
          src={EMBED_URL}
          style={{ border: 0 }}
          width="100%"
          height="650"
          frameBorder="0"
          scrolling="no"
        />
      </div>
    </div>
  );
}
