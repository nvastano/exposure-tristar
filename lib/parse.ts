export type ParsedEntry = {
  player: string;
  sprintTimes: number[];
  throwVelos: number[];
};

function parseNumberList(part: string | undefined): number[] {
  if (!part) return [];
  return part
    .split(";")
    .map((s) => parseFloat(s.trim()))
    .filter((n) => !Number.isNaN(n));
}

/**
 * Parses lines like:
 *   "Cafrey - 4.53; 4.43; 4.78 / 50; 48"
 *   "Bryson - n/a"
 */
export function parseQuickPaste(text: string): ParsedEntry[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [namePart, ...rest] = line.split(" - ");
      const player = namePart.trim();
      const dataPart = rest.join(" - ").trim();

      if (!dataPart || dataPart.toLowerCase() === "n/a") {
        return { player, sprintTimes: [], throwVelos: [] };
      }

      const [sprintPart, throwPart] = dataPart.split("/");
      return {
        player,
        sprintTimes: parseNumberList(sprintPart),
        throwVelos: parseNumberList(throwPart),
      };
    });
}
