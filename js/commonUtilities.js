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
  
export async function fetchJsonFile(filePath) {
    try {
        let res = await fetch(filePath);
        let json = await res.json();
        console.log(`fetchFile(${filePath}) RESULT:`, json);
        return json;
    } catch (err) {
        console.log(`fetchFile(${filePath}) ERROR:`, err);
        return new Error(err)
    }
}
  
export function loadJSON(file, callback) {
    try {
        loadFile(file, "application/json", (res) => {
            callback(JSON.parse(res));
        })
    } catch(err) {
        throw new Error(err);
    }
}
  
  /*
    Common MIME Types:
      application/json
      application/xml
      text/plain
      text/javascript
      text/csv
  */
export function loadFile(file, mime="text/plain", callback) {
    var xobj = new XMLHttpRequest();
        xobj.overrideMimeType(mime);
    xobj.open('GET', file, true);
    xobj.onreadystatechange = function () {
        if (xobj.readyState == 4 && xobj.status == "200") {
            // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
            callback(xobj.responseText);
        } else {
            //console.log(`loadFile | status: ${xobj.status} | readyState: ${xobj.readyState}`);
        }
    };
    xobj.send(null);
}
