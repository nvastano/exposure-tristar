export type FieldPositions = {
  P: string;
  C: string;
  "1B": string;
  "2B": string;
  "3B": string;
  SS: string;
  LF: string;
  CF: string;
  RF: string;
};

export type Situation = {
  id: string;
  title: string;
  description: string;
  answers: FieldPositions;
};

export const SITUATIONS: Situation[] = [
  {
    id: "s01",
    title: "Runner on 1st — Ground Ball to Shortstop",
    description:
      "Runner on 1st base only, no outs. The batter hits a ground ball to the shortstop. Where does each player go?",
    answers: {
      P: "Break toward 1st base to back up the throw",
      C: "Stay at home plate in case of an overthrow",
      "1B": "Hold runner briefly, then get to the bag to receive a possible throw from 2B",
      "2B": "Cover 2nd base — receive the force throw from the SS",
      "3B": "Hold position at 3rd base",
      SS: "Field the ball, throw to 2nd for the force out",
      LF: "Back up 3rd base",
      CF: "Back up the play at 2nd base",
      RF: "Hustle toward the 1st base line to back up any overthrow",
    },
  },
  {
    id: "s02",
    title: "Runner on 2nd — Fly Ball to Right Field",
    description:
      "Runner on 2nd base only, less than 2 outs. The batter hits a fly ball to right field. Where does each player go?",
    answers: {
      P: "Hustle to back up 3rd base in case the runner tags and advances",
      C: "Cover home plate — runner may tag and score",
      "1B": "Move toward the 1st base foul line as a cut-off option",
      "2B": "Move toward the right side as a potential cut-off or relay",
      "3B": "Hold the runner at 3rd if they tag; then alert for a throw to the plate",
      SS: "Cover 2nd base",
      LF: "Back up center field on the play",
      CF: "Back up right field",
      RF: "Field the ball; look runner back to 2nd or throw to the cut-off",
    },
  },
  {
    id: "s03",
    title: "Bases Loaded — Ground Ball to Pitcher",
    description:
      "Bases loaded, no outs. Batter hits a ground ball right back to the pitcher. Where does each player go?",
    answers: {
      P: "Field the ball, throw home to start a double play (home-to-1st)",
      C: "Catch throw from pitcher, apply tag if needed, then throw to 1st",
      "1B": "Hold runner at 1st briefly, then crash toward the bag to receive the throw from the catcher",
      "2B": "Cover 1st base if the 1B crashes in; stay alert for a wider ball",
      "3B": "Hold position — runner on 3rd will be going on contact",
      SS: "Cover 2nd base in case the play develops there",
      LF: "Back up 3rd base",
      CF: "Back up 2nd base area",
      RF: "Back up 1st base on an overthrow",
    },
  },
  {
    id: "s04",
    title: "No Runners — Ground Ball Down the 1st Base Line",
    description:
      "Bases empty. The batter hits a sharp ground ball down the 1st base line. Where does each player go?",
    answers: {
      P: "Sprint to cover 1st base — the 1B will field the ball",
      C: "Back up 1st base on an overthrow",
      "1B": "Charge the ball, field it, flip to the pitcher covering 1st",
      "2B": "Shade toward 1st base as secondary backup",
      "3B": "Move toward the line to shade for a possible foul ball or cut the angle",
      SS: "Cover 2nd base",
      LF: "Stay in position — minimal movement needed",
      CF: "Back up 2nd base area",
      RF: "Crash in toward the line to back up the 1B",
    },
  },
  {
    id: "s05",
    title: "Runner on 3rd — Wild Pitch / Passed Ball",
    description:
      "Runner on 3rd base, any count. The pitch gets past the catcher. Where does each player go?",
    answers: {
      P: "Sprint to cover home plate immediately",
      C: "Scramble to retrieve the ball, look to throw to the pitcher covering the plate",
      "1B": "Shade toward home plate area as secondary backup",
      "2B": "Move toward 1st base — runner may attempt to advance if the play is close",
      "3B": "Runner will break for home; alert for a possible play at 3rd if the throw beats the runner",
      SS: "Cover 2nd base",
      LF: "Back up home plate from behind",
      CF: "Hold position",
      RF: "Hold position",
    },
  },
  {
    id: "s06",
    title: "Runners on 1st and 2nd — Fly Ball to Left Field",
    description:
      "Runners on 1st and 2nd, less than 2 outs. The batter hits a fly ball to left field. Where does each player go?",
    answers: {
      P: "Back up 3rd base — runner on 2nd will likely tag and advance",
      C: "Cover home plate — runner on 2nd may score if the throw goes to 3rd",
      "1B": "Hold runner on 1st, then be ready to receive a possible cut-off throw",
      "2B": "Move to short right field as a possible relay/cut-off",
      "3B": "Hold the runner at 3rd until the ball is caught; alert for a throw to the plate",
      SS: "Move to shallow left field as the relay/cut-off man",
      LF: "Field the ball; look runner back to 2nd or throw through the SS cut-off",
      CF: "Back up left field",
      RF: "Hold position",
    },
  },
  {
    id: "s07",
    title: "Runner on 1st — Stolen Base Attempt",
    description:
      "Runner on 1st base takes off to steal 2nd. Where does each player go on the pitch?",
    answers: {
      P: "Deliver the pitch quickly; be ready to back up 2nd if the throw goes through",
      C: "Receive pitch and fire a throw to 2nd base",
      "1B": "Release the runner and be alert for a pick-off or errant throw",
      "2B": "Cover 2nd base — take the throw from the catcher and apply the tag",
      "3B": "Hold position; watch for the runner rounding 2nd",
      SS: "Cover 2nd base if the 2B is shading the other way (coordinate pre-pitch)",
      LF: "Back up 3rd base",
      CF: "Back up the throw to 2nd base from behind",
      RF: "Hold position",
    },
  },
  {
    id: "s08",
    title: "No Runners — Base Hit to Center Field",
    description:
      "Bases empty. Batter hits a single to center field. Where does each player go?",
    answers: {
      P: "Back up 2nd base from behind the mound in case of an overthrow",
      C: "Stay at home plate",
      "1B": "Hold near 1st — runner will stop at 1st on a single",
      "2B": "Move toward 1st base side of 2nd as relay if the runner rounds 1st hard",
      "3B": "Hold position at 3rd",
      SS: "Cover 2nd base in case the runner tries to stretch to a double",
      LF: "Back up center field",
      CF: "Field the ball quickly to prevent a double",
      RF: "Back up center field",
    },
  },
  {
    id: "s09",
    title: "Runner on 2nd — Ground Ball to Third Baseman",
    description:
      "Runner on 2nd base, no outs. The batter hits a ground ball to the third baseman. Where does each player go?",
    answers: {
      P: "Break toward 1st base to back up the throw",
      C: "Cover home plate — runner on 2nd may attempt to score on a wild throw",
      "1B": "Get to the bag to receive the throw from 3B",
      "2B": "Cover 1st base if the 1B charges in (unlikely here, but stay aware)",
      "3B": "Check the runner at 2nd, then throw to 1st for the out",
      SS: "Cover 2nd base — runner will have to decide whether to advance",
      LF: "Back up 3rd base in case of a wild throw",
      CF: "Back up 2nd base area",
      RF: "Back up the throw to 1st base from the right side",
    },
  },
  {
    id: "s10",
    title: "Runner on 3rd — Less Than 2 Outs, Fly Ball to Outfield",
    description:
      "Runner on 3rd, less than 2 outs. The batter hits a deep fly ball to center field. Tag-up situation. Where does each player go?",
    answers: {
      P: "Sprint to cover home plate — the runner will tag and try to score",
      C: "Cover home plate; be ready to receive the throw and apply the tag",
      "1B": "Hold near 1st; move toward home as relay if the throw is coming in",
      "2B": "Position as a cut-off man in shallow right/center for a potential relay",
      "3B": "Watch the runner tag properly at 3rd; alert defense if runner leaves early",
      SS: "Position as relay cut-off in shallow left/center",
      LF: "Back up center field",
      CF: "Field the ball, throw home through the cut-off or direct if close enough",
      RF: "Back up center field on the play",
    },
  },
];
