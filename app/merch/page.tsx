import Link from "next/link";

const PRODUCTS = [
  {
    href: "/hoodieorder",
    img: "/hoodie-front.png",
    name: "Team Hoodie",
    description: "Front logo · Back number for players",
    price: "$40 – $50",
    badge: null,
  },
  {
    href: "/cagejacketorder",
    img: "/cage-jacket-mockup.png",
    name: "Cage Jacket",
    description: "Short-sleeve woven warm-up · Players only",
    price: "$36",
    badge: "Players Only",
  },
  {
    href: "/hatorder",
    img: "/hat-mockup.png",
    name: "Parent & Coach Hat",
    description: "Champro HC1 Mid Profile · Black with TE logo",
    price: "$20",
    badge: "Parents & Coaches",
  },
  {
    href: "/towelorder",
    img: "/towel-trainer-1.jpg",
    name: "Pitching Towel Trainer",
    description: "Weighted baseball + microfiber towel",
    price: "$5",
    badge: null,
  },
];

export default function MerchPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-accent text-xs font-bold tracking-widest uppercase mb-1">Team Elite Prime · 12U</p>
        <h1 className="text-2xl font-bold tracking-wide">Team Store</h1>
        <p className="text-white/50 text-sm mt-1">
          Order gear for the season. Coach will follow up with payment details after each order is submitted.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PRODUCTS.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="group flex flex-col rounded-xl border border-white/10 bg-white/3 overflow-hidden hover:border-accent/40 hover:bg-white/5 transition-colors"
          >
            <div className="bg-black w-full aspect-square overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.img}
                alt={p.name}
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-4 flex flex-col gap-1">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-bold tracking-wide text-base">{p.name}</h2>
                <span className="text-lg font-black text-accent shrink-0">{p.price}</span>
              </div>
              <p className="text-white/40 text-xs">{p.description}</p>
              {p.badge && (
                <span className="mt-1 self-start text-xs font-semibold px-2 py-0.5 rounded-full bg-white/8 text-white/50 border border-white/10">
                  {p.badge}
                </span>
              )}
              <div className="mt-3 text-accent text-xs font-semibold tracking-wide group-hover:underline">
                Order now →
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
