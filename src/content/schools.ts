/** Official high schools in Turin and its province. Free text still accepts any other school. */
export type TurinSchool = {
  name: string;
  city: string;
};

export const turinSchools = [
  { name: "Liceo classico Massimo d'Azeglio", city: "Torino" },
  { name: "Liceo classico Vittorio Alfieri", city: "Torino" },
  { name: "Liceo classico Vincenzo Gioberti", city: "Torino" },
  { name: "Liceo classico Camillo Benso di Cavour", city: "Torino" },
  { name: "Convitto Nazionale Umberto I", city: "Torino" },
  { name: "Liceo scientifico Galileo Ferraris", city: "Torino" },
  { name: "Liceo scientifico Galileo Galilei", city: "Torino" },
  { name: "Liceo scientifico Carlo Cattaneo", city: "Torino" },
  { name: "Liceo scientifico Piero Gobetti", city: "Torino" },
  { name: "Liceo scientifico Enrico Fermi", city: "Torino" },
  { name: "Liceo scientifico Alessandro Volta", city: "Torino" },
  { name: "Liceo scientifico Niccolò Copernico", city: "Torino" },
  { name: "Liceo scientifico Albert Einstein", city: "Torino" },
  { name: "Liceo scientifico Gino Segrè", city: "Torino" },
  { name: "Liceo scientifico Altiero Spinelli", city: "Torino" },
  { name: "Liceo artistico Renato Cottini", city: "Torino" },
  { name: "Liceo delle scienze umane Regina Margherita", city: "Torino" },
  { name: "Liceo Domenico Berti", city: "Torino" },
  { name: "Liceo Norberto Bobbio", city: "Torino" },
  { name: "Liceo Valsalice", city: "Torino" },
  { name: "Istituto Sociale", city: "Torino" },
  { name: "Liceo Carlo Botta", city: "Ivrea" },
  { name: "Liceo G. F. Porporato", city: "Pinerolo" },
  { name: "Liceo Augusto Monti", city: "Chieri" },
  { name: "Liceo Isaac Newton", city: "Chivasso" },
  { name: "Liceo Ettore Majorana", city: "Moncalieri" },
  { name: "Liceo Charles Darwin", city: "Rivoli" },
  { name: "Liceo Baldessano-Roccati", city: "Carmagnola" },
  { name: "Liceo Norberto Rosa", city: "Susa" },
] as const satisfies readonly TurinSchool[];

export function searchTurinSchools(query: string) {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];
  return turinSchools
    .filter((school) => `${school.name} ${school.city}`.toLowerCase().includes(needle))
    .slice(0, 6)
    .map((school) => `${school.name}, ${school.city}`);
}
