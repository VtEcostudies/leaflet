/*
    Use json object from GBIF occurrence/search API to parse
    scientificName into canonicalName.
*/
export function parseCanonicalFromScientific(occJson) {
    var toks = occJson.scientificName.split(' ');
    var name = null;
    switch(occJson.taxonRank.toUpperCase()) {
      case 'SUBSPECIES':
      case 'VARIETY':
      case 'FORM':
        name = `${toks[0]} ${toks[1]} ${toks[2]}`;
        break;
      case 'SPECIES':
        name = `${toks[0]} ${toks[1]}`;
        name = occJson.species;
        break;
      case 'GENUS':
      default:
        name = `${toks[0]}`;
        break;
    }
    return name;
  }
  