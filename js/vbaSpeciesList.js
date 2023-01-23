import { occData, getOccsByFilters, getOccsByDatasetAndWKT, getOccsFromFile } from './fetchGbifOccs.js';

const objUrlParams = new URLSearchParams(window.location.search);
const geometry = objUrlParams.get('geometry');
const dataset = objUrlParams.get('dataset');
const block = objUrlParams.get('block');
const other = ''; var objOther = {};
objUrlParams.forEach((val, key) => {
    if ('geometry'!=key && 'block'!=key && 'dataset'!=key) {
      other += `&${key}=${val}`;
      objOther[key] = val;
    }
  });
const eleTbl = document.getElementById("speciesListTable");

/*
geometry=POLYGON((-73.0 44.0,-72.75 44.0,-72.75 44.2,-73.0 44.2,-73.0 44.0))
coordinates: Array (1)
  coordinates[0]: Array(5)
    0: Array [ -72.56200954781823, 44.291742756710484 ]
    1: Array [ -72.56205261876526, 44.25007688817722 ]
    2: Array [ -72.62455517288059, 44.2500594469373 ]
    3: Array [ -72.6245558831222, 44.2917251487992 ]
    4: Array [ -72.56200954781823, 44.291742756710484 ]
*/
async function getBlockSpeciesList(block='block_name', dataset='vba1', gWkt='POLYGON(())') {

    let occs = await getOccsByDatasetAndWKT(dataset, gWkt);
    //console.log('getBlockSpeciesList', occs);
    let hedSpcs = dataset + ' Species in ' + block + ':';
    let arrSpcs = [];
    let txtSpcs = dataset + ' in ' + block + ':\r\n';
    let arrOccs = occs.results;
    let j=1;
    for (var i=0; i<arrOccs.length; i++) {
      if (!arrSpcs.includes(arrOccs[i].scientificName)) {
        arrSpcs.push(arrOccs[i].scientificName);
        txtSpcs += j++ + '. ' + arrOccs[i].taxonRank + ': ' + arrOccs[i].scientificName + '\r\n';
      }
    }
    txtSpcs = arrSpcs.length + ' taxa for ' + txtSpcs;
    return {'head': hedSpcs, 'text': txtSpcs, 'array': arrSpcs};
  }

function addTableHead(headInfo='Header Info', headCols=['Count', 'Scientific Name']) {
    let objHed = eleTbl.createTHead();
    let hedRow = objHed.insertRow(0);
    let colObj = hedRow.insertCell(0);
    colObj.innerHTML = headInfo;
    hedRow = objHed.insertRow(1);
    headCols.forEach(async (title, i) => {
        colObj = hedRow.insertCell(i);
        colObj.innerHTML = title;
    })
}
  
//Create table row for each array element, then fill row of cells
async function addTaxaFromArr(sArr) {
    console.log('addTaxaFromArr', sArr);
    sArr.forEach(async (objSpc, rowIdx) => {
        console.log(objSpc, rowIdx)
      let objRow = eleTbl.insertRow(rowIdx);
      await fillRow(objSpc, objRow, rowIdx);
    })
  }

//Create cells for each object element
async function fillRow(objSpc, objRow, rowIdx){
    let colObj = objRow.insertCell(0);
    colObj.innerHTML += rowIdx+1;
    colObj = objRow.insertCell(1);
    colObj.innerHTML = objSpc;
}

if (block && dataset && geometry) {
    let spcs = await getBlockSpeciesList(block, dataset, geometry);
    //alert(spcs.head + '\n' + spcs.text);
    addTaxaFromArr(spcs.array);
    addTableHead(spcs.head);
} else {
    alert(`Must call with query parameters: block, dataset, geometry.`)
}
