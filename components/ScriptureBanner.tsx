"use client";

import { useEffect, useState } from "react";

const VERSES = [
  { text: "I can do all things through Christ who strengthens me.", ref: "Philippians 4:13" },
  { text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.", ref: "Joshua 1:9" },
  { text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.", ref: "Jeremiah 29:11" },
  { text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.", ref: "Isaiah 40:31" },
  { text: "Have I not commanded you? Be strong and courageous. Do not be frightened, and do not be dismayed.", ref: "Joshua 1:9" },
  { text: "The Lord is my strength and my shield; my heart trusts in him, and he helps me.", ref: "Psalm 28:7" },
  { text: "No discipline seems pleasant at the time, but painful. Later on, however, it produces a harvest of righteousness and peace.", ref: "Hebrews 12:11" },
  { text: "Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.", ref: "Colossians 3:23" },
  { text: "Do you not know that in a race all the runners run, but only one gets the prize? Run in such a way as to get the prize.", ref: "1 Corinthians 9:24" },
  { text: "Everyone who competes in the games goes into strict training. They do it to get a crown that will not last, but we do it to get a crown that will last forever.", ref: "1 Corinthians 9:25" },
  { text: "Let us run with endurance the race that is set before us, looking to Jesus, the founder and perfecter of our faith.", ref: "Hebrews 12:1–2" },
  { text: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.", ref: "Philippians 4:6" },
  { text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose.", ref: "Romans 8:28" },
  { text: "Be on your guard; stand firm in the faith; be courageous; be strong.", ref: "1 Corinthians 16:13" },
  { text: "The Lord will fight for you; you need only to be still.", ref: "Exodus 14:14" },
  { text: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.", ref: "Proverbs 3:5–6" },
  { text: "Commit to the Lord whatever you do, and he will establish your plans.", ref: "Proverbs 16:3" },
  { text: "I have fought the good fight, I have finished the race, I have kept the faith.", ref: "2 Timothy 4:7" },
  { text: "For God has not given us a spirit of fear, but of power and of love and of a sound mind.", ref: "2 Timothy 1:7" },
  { text: "Blessed is the one who perseveres under trial because, having stood the test, that person will receive the crown of life.", ref: "James 1:12" },
  { text: "He gives strength to the weary and increases the power of the weak.", ref: "Isaiah 40:29" },
  { text: "Be strong in the Lord and in his mighty power.", ref: "Ephesians 6:10" },
  { text: "You are the light of the world. A town built on a hill cannot be hidden.", ref: "Matthew 5:14" },
  { text: "And let us not grow weary of doing good, for in due season we will reap, if we do not give up.", ref: "Galatians 6:9" },
  { text: "Even youths grow tired and weary, and young men stumble and fall; but those who hope in the Lord will renew their strength.", ref: "Isaiah 40:30–31" },
  { text: "The Lord your God is with you, the Mighty Warrior who saves. He will take great delight in you.", ref: "Zephaniah 3:17" },
  { text: "With man this is impossible, but with God all things are possible.", ref: "Matthew 19:26" },
  { text: "If God is for us, who can be against us?", ref: "Romans 8:31" },
  { text: "Do not conform to the pattern of this world, but be transformed by the renewing of your mind.", ref: "Romans 12:2" },
  { text: "Be watchful, stand firm in the faith, act like men, be strong.", ref: "1 Corinthians 16:13" },
  { text: "I press on toward the goal to win the prize for which God has called me heavenward in Christ Jesus.", ref: "Philippians 3:14" },
  { text: "The name of the Lord is a fortified tower; the righteous run to it and are safe.", ref: "Proverbs 18:10" },
  { text: "Have not I commanded thee? Be strong and courageous; be not afraid, neither be thou dismayed.", ref: "Joshua 1:9" },
  { text: "A man who lacks judgment derides his neighbor, but a man of understanding holds his tongue.", ref: "Proverbs 11:12" },
  { text: "Walk in a manner worthy of the calling to which you have been called, with all humility and gentleness, with patience.", ref: "Ephesians 4:1–2" },
  { text: "No weapon formed against you shall prosper.", ref: "Isaiah 54:17" },
  { text: "The heart of man plans his way, but the Lord establishes his steps.", ref: "Proverbs 16:9" },
  { text: "Humble yourselves before the Lord, and he will lift you up.", ref: "James 4:10" },
  { text: "Rejoice in hope, be patient in tribulation, be constant in prayer.", ref: "Romans 12:12" },
  { text: "The Lord is close to the brokenhearted and saves those who are crushed in spirit.", ref: "Psalm 34:18" },
];

function pickVerse(): number {
  // Rotate through the list using the current 10-minute window so it changes often
  const windowIndex = Math.floor(Date.now() / (1000 * 60 * 10));
  return windowIndex % VERSES.length;
}

export default function ScriptureBanner({ mobile = false }: { mobile?: boolean }) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setIdx(pickVerse());
    // Rotate every 10 minutes while the tab is open
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(pickVerse());
        setVisible(true);
      }, 400);
    }, 1000 * 60 * 10);
    return () => clearInterval(id);
  }, []);

  const verse = VERSES[idx];

  if (mobile) {
    return (
      <div className="md:hidden border-b border-white/10 px-4 py-2.5 bg-white/[0.02]">
        <p
          className="text-xs text-white/50 italic leading-relaxed transition-opacity duration-400"
          style={{ opacity: visible ? 1 : 0 }}
        >
          "{verse.text}"{" "}
          <span className="not-italic text-white/30 font-semibold">— {verse.ref}</span>
        </p>
      </div>
    );
  }

  return (
    <div
      className="hidden md:flex flex-col justify-center flex-1 px-8 max-w-lg transition-opacity duration-400"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <p className="text-xs text-white/40 italic leading-relaxed line-clamp-2">
        "{verse.text}"
      </p>
      <p className="text-xs text-white/25 mt-0.5 font-semibold">— {verse.ref}</p>
    </div>
  );
}
