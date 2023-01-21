/*
    This is a callable node.js processor to convert GBIF tab-delimited occurrence download files to json.
*/
const fs = require('fs');
const { csvFileTo2DObject } = require('C:/Users/jtloo/Documents/VCE/VAL_Data_Pipelines/VAL_Utilities/99_parse_csv_to_array.js');
const csvFile = {
    'test': 'C:/Users/jtloo/Documents/VCE/VAL_webUI/val_www/val_www/leaflet/occ/vtb2_occs_2008-2022_simple_abbrev.tsv',
    'vtb1': 'C:/Users/jtloo/Documents/VCE/VAL_webUI/val_www/val_www/leaflet/occ/vtb1_occs_1000-2002_simple.tsv',
    'vtb2': 'C:/Users/jtloo/Documents/VCE/VAL_webUI/val_www/val_www/leaflet/occ/vtb2_occs_2008-2022_simple.tsv',
    'vba1': 'C:/Users/jtloo/Documents/VCE/VAL_webUI/val_www/val_www/leaflet/occ/vba1_occs_simple.tsv',
};
const includeColumns = ['gbifID','datasetKey','taxonRank','scientificName','occurrenceStatus','decimalLatitude','decimalLongitude','eventDate','taxonKey','identifiedBy','dateIdentified','recordedBy']

async function getJsonFromCsv(dataset='vba1') {
    let outPath = csvFile[dataset].split('.')[0] + '.json';
    let ws = fs.createWriteStream(outPath);
    let json = await csvFileTo2DObject(csvFile[dataset],'\t',true,false,includeColumns);
    let text = JSON.stringify(json);
    console.log('text size:', text.length);
    await ws.write(text);
    ws.close();
    ws.on('close', () => {
        console.log('file closed:', outPath);
    })

    return json;
}

getJsonFromCsv('vtb1');