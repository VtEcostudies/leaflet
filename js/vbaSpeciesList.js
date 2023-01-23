import { getOccsByFilters } from './fetchGbifOccs.js';

const objUrlParams = new URLSearchParams(window.location.search);
const geometry = objUrlParams.get('geometry');
const dataset = objUrlParams.get('dataset');
const block = objUrlParams.get('block');
const taxonKeyA = objUrlParams.getAll('taxonKey');
const butterflyKeys = 'taxon_key=6953&taxon_key=5473&taxon_key=7017&taxon_key=9417&taxon_key=5481&taxon_key=1933999';
console.log('Query Param(s) taxonKeys:', taxonKeyA);

const other = ''; var objOther = {};
objUrlParams.forEach((val, key) => {
    if ('geometry'!=key && 'block'!=key && 'dataset'!=key) {
      other += `&${key}=${val}`;
      objOther[key] = val;
    }
  });

const eleLbl = document.getElementById("speciesListLabel");
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
async function getBlockSpeciesList(block='block_name', dataset=false, gWkt=false, tKeys=false) {

    let occs = await getOccsByFilters(0,300,dataset,gWkt,false,tKeys);
    //console.log('getBlockSpeciesList', occs);
    let hedSpcs = 'Species List for ' + block + (dataset ? ` and dataset ${dataset}` : '')
    let objSpcs = {};
    let arrOccs = occs.results;
    for (var i=0; i<arrOccs.length; i++) {
        let sciName = arrOccs[i].scientificName;
        if (objSpcs[sciName]) { //check to replace name with more recent observation
            if (arrOccs[i].eventDate > objSpcs[sciName].eventDate) {
                console.log('getOccsByFilters FOUND MORE RECENT OBSERVATION for', sciName, arrOccs[i].eventDate, '>',objSpcs[sciName].eventDate);
                objSpcs[sciName] = {
                    'scientificName': arrOccs[i].scientificName,
                    'vernacularName': arrOccs[i].vernacularName,
                    'eventDate':  arrOccs[i].eventDate
                }
            }
      } else { //add new name
        objSpcs[sciName] = {
            'scientificName': arrOccs[i].scientificName,
            'vernacularName': arrOccs[i].vernacularName,
            'eventDate':  arrOccs[i].eventDate
        }
      }
    }
    return {'head': hedSpcs, cols:['Scientific Name','Vernacular Name','Last Observed'], 'array': objSpcs};
  }

var waitRow; var waitObj;

async function addTableWait() {
    waitRow = eleTbl.insertRow(0);
    waitObj = waitRow.insertCell(0);
    waitObj.style = 'text-align: center;';
    waitObj.innerHTML = `<i class="fa fa-spinner fa-spin" style="font-size:60px;"></i>`;
}

function delTableWait() {
    waitObj.remove();
    waitRow.remove();
}
  
//put one row in the header for column names
function addTableHead(headCols=['Scientific Name','Vernacular Name','Last Observed']) {
    let objHed = eleTbl.createTHead();
    let hedRow = objHed.insertRow(0);
    let colObj = hedRow.insertCell(0);
    for (var i=0; i<headCols.length; i++) {
        colObj = hedRow.insertCell(i);
        colObj.innerHTML = headCols[i];
    }
}
  
//Create table row for each array element, then fill row of cells
async function addTaxaFromArr(objArr) {
    //console.log('addTaxaFromArr', objArr);
    let rowIdx=0;
    for (const [spcKey, objSpc] of Object.entries(objArr)) {
        //console.log(objSpc, rowIdx)
        let objRow = eleTbl.insertRow(rowIdx);
        await fillRow(objSpc, objRow, rowIdx++);
    }
  }

//Create cells for each object element
async function fillRow(objSpc, objRow, rowIdx) {
    let colIdx = 0;
    //let colObj = objRow.insertCell(colIdx++);
    //colObj.innerHTML += rowIdx+1;
    for (const [key, val] of Object.entries(objSpc)) {
        let colObj = objRow.insertCell(colIdx++);
        colObj.innerHTML = val ? val : '';
    }
}

function setLabelText(block, dataset=false, taxonKeys=false, count=0) {
    eleLbl.innerText = `Species List for Survey Block '${block}' and ${dataset ? 'dataset ' + dataset : ''}: ${count} taxa`;
}

if (block && geometry) {
    let taxonKeys;
    addTableWait();
    if (!dataset && (!taxonKeyA.length)) {taxonKeys = butterflyKeys}
    let spcs = await getBlockSpeciesList(block, dataset, geometry, taxonKeys);
    addTaxaFromArr(spcs.array);
    addTableHead(spcs.cols);
    setLabelText(block, dataset, taxonKeys, Object.keys(spcs.array).length);
    delTableWait();
} else {
    alert(`Must call with at least query parameters: block= & geometry=. Alternatively pass one or more taxon_key=1234.`)
}
