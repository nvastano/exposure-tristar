export type TriviaQuestion = {
  id: string;
  question: string;
  options: [string, string, string, string];
  answer: "A" | "B" | "C" | "D";
  explanation: string;
};

export const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  {
    id: "q01",
    question: "Who holds the MLB record for most career home runs?",
    options: ["Hank Aaron", "Barry Bonds", "Babe Ruth", "Alex Rodriguez"],
    answer: "B",
    explanation: "Barry Bonds hit 762 career home runs, surpassing Hank Aaron's record of 755.",
  },
  {
    id: "q02",
    question: "What year was the first modern World Series played?",
    options: ["1898", "1900", "1903", "1910"],
    answer: "C",
    explanation: "The first modern World Series was played in 1903 between the Boston Americans and Pittsburgh Pirates.",
  },
  {
    id: "q03",
    question: "How many stitches are on a regulation MLB baseball?",
    options: ["88", "96", "108", "120"],
    answer: "C",
    explanation: "A regulation MLB baseball has exactly 108 double stitches (216 individual stitches).",
  },
  {
    id: "q04",
    question: "Joe DiMaggio's consecutive-game hitting streak in 1941 stands at how many games?",
    options: ["44", "48", "52", "56"],
    answer: "D",
    explanation: "Joe DiMaggio hit safely in 56 consecutive games in 1941 — a record that still stands today.",
  },
  {
    id: "q05",
    question: "What is the distance from home plate to the pitcher's mound in MLB?",
    options: ["58.5 feet", "60.5 feet", "62 feet", "64 feet"],
    answer: "B",
    explanation: "The pitcher's mound is 60 feet 6 inches (60.5 ft) from home plate.",
  },
  {
    id: "q06",
    question: "Which franchise has won the most World Series championships?",
    options: ["Boston Red Sox", "St. Louis Cardinals", "Los Angeles Dodgers", "New York Yankees"],
    answer: "D",
    explanation: "The New York Yankees have won 27 World Series titles, far more than any other team.",
  },
  {
    id: "q07",
    question: "What is a 'golden sombrero' in baseball?",
    options: [
      "Hitting a walk-off home run",
      "Striking out four times in one game",
      "Hitting for the cycle",
      "A no-hitter through 6 innings",
    ],
    answer: "B",
    explanation: "A golden sombrero is when a batter strikes out four times in a single game.",
  },
  {
    id: "q08",
    question: "Who is known as 'The Say Hey Kid'?",
    options: ["Mickey Mantle", "Duke Snider", "Stan Musial", "Willie Mays"],
    answer: "D",
    explanation: "Willie Mays earned the nickname 'The Say Hey Kid' early in his career with the New York Giants.",
  },
  {
    id: "q09",
    question: "What does ERA stand for?",
    options: [
      "Extra Run Average",
      "Error Run Analysis",
      "Earned Run Average",
      "Extra Runs Allowed",
    ],
    answer: "C",
    explanation: "ERA stands for Earned Run Average — the average number of earned runs a pitcher allows per 9 innings.",
  },
  {
    id: "q10",
    question: "Who broke Major League Baseball's color barrier in 1947?",
    options: ["Satchel Paige", "Larry Doby", "Josh Gibson", "Jackie Robinson"],
    answer: "D",
    explanation: "Jackie Robinson broke MLB's color barrier on April 15, 1947, when he took the field for the Brooklyn Dodgers.",
  },
  {
    id: "q11",
    question: "What does WHIP stand for in baseball statistics?",
    options: [
      "Walks and Hits per Inning Pitched",
      "Walks, Hits, and Innings Pitched",
      "Wild pitches, Hits, Innings Pitched",
      "Weighted Hits In Pitching",
    ],
    answer: "A",
    explanation: "WHIP stands for Walks and Hits per Inning Pitched — a measure of how many base runners a pitcher allows per inning.",
  },
  {
    id: "q12",
    question: "Who holds the MLB record for most career stolen bases?",
    options: ["Lou Brock", "Tim Raines", "Vince Coleman", "Rickey Henderson"],
    answer: "D",
    explanation: "Rickey Henderson stole 1,406 bases in his career, nearly 500 more than second-place Lou Brock.",
  },
  {
    id: "q13",
    question: "What is an 'infield fly' in baseball?",
    options: [
      "Any fly ball hit to the infield",
      "A balk by the pitcher",
      "An automatic out on a pop-up with runners on 1st and 2nd (or bases loaded) and less than 2 outs",
      "A foul tip caught by the catcher",
    ],
    answer: "C",
    explanation: "The infield fly rule calls the batter automatically out to prevent fielders from intentionally dropping pop-ups to get easy double plays.",
  },
  {
    id: "q14",
    question: "What does OBP stand for?",
    options: [
      "Official Batter Points",
      "On-Base Percentage",
      "Out-Ball Percentage",
      "Overall Batting Performance",
    ],
    answer: "B",
    explanation: "OBP (On-Base Percentage) measures how often a batter reaches base via hit, walk, or hit-by-pitch.",
  },
  {
    id: "q15",
    question: "Nolan Ryan set the single-season strikeout record in 1973 with how many Ks?",
    options: ["348", "363", "383", "401"],
    answer: "C",
    explanation: "Nolan Ryan struck out 383 batters in 1973 with the California Angels, a record that still stands.",
  },
  {
    id: "q16",
    question: "What is a 'squeeze play'?",
    options: [
      "A pickoff attempt at first base",
      "A double steal with runners on 1st and 2nd",
      "A bunt designed to score a runner from third base",
      "A hit-and-run with a runner on second",
    ],
    answer: "C",
    explanation: "A squeeze play is when a batter bunts with a runner on third base, trying to score the runner on the play.",
  },
  {
    id: "q17",
    question: "What is 'painting the corner' in baseball?",
    options: [
      "A hit down the foul line",
      "A pitch that barely catches the edge of the strike zone",
      "A stolen base on a pitch in the dirt",
      "A slide into home plate",
    ],
    answer: "B",
    explanation: "Painting the corner means throwing a pitch that catches the very edge of the strike zone — a tough pitch for hitters to hit and umpires to call.",
  },
  {
    id: "q18",
    question: "In what year did the designated hitter rule first appear in the American League?",
    options: ["1968", "1971", "1973", "1976"],
    answer: "C",
    explanation: "The American League adopted the DH rule in 1973. The NL followed in 2022 when MLB made it universal.",
  },
  {
    id: "q19",
    question: "What does 'going yard' mean in baseball slang?",
    options: ["Stealing home plate", "Hitting a triple", "Hitting a home run", "An inside-the-park home run only"],
    answer: "C",
    explanation: "'Going yard' means hitting a home run — the ball leaves the park (the yard).",
  },
  {
    id: "q20",
    question: "A pitcher who records 27 consecutive outs without allowing a baserunner has thrown a…",
    options: ["One-hitter", "Perfect game", "No-hitter", "Complete game shutout"],
    answer: "B",
    explanation: "A perfect game requires retiring all 27 batters in order — no hits, no walks, no errors, no runners of any kind.",
  },
  {
    id: "q21",
    question: "What is a 'rundown' in baseball?",
    options: [
      "A play where the fielding team runs down a fly ball",
      "A play where a baserunner is caught between two bases and fielders tag them out",
      "A sprint time drill in practice",
      "When a pitcher's velocity drops late in the game",
    ],
    answer: "B",
    explanation: "A rundown (also called a 'pickle') is when a baserunner is caught between two bases and fielders throw back and forth trying to tag them out.",
  },
  {
    id: "q22",
    question: "How many balls does it take to walk a batter?",
    options: ["3", "4", "5", "It depends on the count"],
    answer: "B",
    explanation: "Four balls result in a walk (also called a base on balls), allowing the batter to advance to first base.",
  },
  {
    id: "q23",
    question: "Cal Ripken Jr. is famous for playing in how many consecutive games?",
    options: ["1,897", "2,130", "2,632", "2,900"],
    answer: "C",
    explanation: "Cal Ripken Jr. played in 2,632 consecutive games from 1982 to 1998, breaking Lou Gehrig's record of 2,130.",
  },
  {
    id: "q24",
    question: "What pitch typically moves away from a right-handed batter when thrown by a right-handed pitcher?",
    options: ["Two-seam fastball", "Curveball", "Changeup", "Slider"],
    answer: "D",
    explanation: "A slider thrown by a right-handed pitcher typically breaks down and away from a right-handed batter.",
  },
  {
    id: "q25",
    question: "What does it mean to 'hit for the cycle'?",
    options: [
      "Hit a home run in four consecutive at-bats",
      "Hit a single, double, triple, and home run in the same game",
      "Go 4-for-4 in a game",
      "Hit a leadoff home run four games in a row",
    ],
    answer: "B",
    explanation: "Hitting for the cycle means a batter gets a single, double, triple, and home run all in the same game — a rare feat.",
  },
];

export function getRandomQuestion(excludeIds: string[] = []): TriviaQuestion {
  const pool = TRIVIA_QUESTIONS.filter((q) => !excludeIds.includes(q.id));
  const source = pool.length > 0 ? pool : TRIVIA_QUESTIONS;
  return source[Math.floor(Math.random() * source.length)];
}
