let gbifApi = "https://api.gbif.org/v1";
let datasetKeys = {occVba1:"0901cecf-55f1-447e-8537-1f7b63a865a0", chkVba1:"73eb16f0-4b06-4347-8069-459bc2d96ddb"};
let butterflies = "taxon_key=6953&taxon_key=5473&taxon_key=7017&taxon_key=9417&taxon_key=5481&taxon_key=1933999";
export const occData = {
    'vtb1':{'file':'vtb1_occs_1000-2002.json','description':'VT Obs before 2002',color:'Red'},
    'vtb2':{'file':'vtb2_occs_2008-2022.json','description':'VT Obs 2002-2022',color:'Blue'},
    'vba1':{'file':'vba1_occs_2002-2007.json','description':'1st VT Atlas 2002-2007',color:'Yellow'},
    'vba2':{'file':'vba2_occs_2023-2028.json','description':'2nd VT Atlas 2023-2028',color:'Cyan'}
};
/*
https://api.gbif.org/v1/occurrence/search
    ?datasetKey=0901cecf-55f1-447e-8537-1f7b63a865a0
    &geometry=POLYGON((-73.0%2044.0,%20-72.75%2044.0,%20-72.75%2044.2,%20-73.0%2044.2,%20-73.0%2044.0))
*/
export async function getOccsByFilters(offset=0, limit=300, datasetKey=datasetKeys.occVba1, geometry, gadmGid) {
let reqHost = gbifApi;
let reqRoute = "/occurrence/search";
let reqData = datasetKey ? `?datasetKey=${datasetKey}` : '';
let reqGeom = geometry ? `&geometry=${geometry}` : '';
let reqGadm = gadmGid ? `&gadmGid=${gadmGid}` : '';
let reqLimits = `&offset=${offset}&limit=${limit}`;
let url = reqHost+reqRoute+reqData+reqGeom+reqGadm+reqLimits;
let enc = encodeURI(url);

console.log(`getOccsByFilters(${offset}, ${limit}, ${datasetKey}, ${geometry}, ${gadmGid}) QUERY:`, enc);

    try {
        let res = await fetch(enc);
        let json = await res.json();
        //console.log(`getOccsByFilters(${offset}, ${limit}, ${datasetKey}, ${geometry}, ${gadmGid}) QUERY:`, enc);
        console.log(`getOccsByFilters(${offset}, ${limit}, ${datasetKey}, ${geometry}, ${gadmGid}) RESULT:`, json);
        json.query = enc;
        return json;
    } catch (err) {
        err.query = enc;
        console.log(`getOccsByFilters(${offset}, ${limit}, ${datasetKey}, ${geometry}, ${gadmGid}) ERROR:`, err);
        return new Error(err)
    }
}

export async function getOccsFromFile(dataset='vba1') {
    try {
        let parr = window.location.pathname.split('/'); delete parr[parr.length-1];
        let path = parr.join('/');
        console.log(`getOccsFromFile:`, `${window.location.protocol}//${window.location.host}/${path}${occData[dataset].file}`);
        let res = await fetch(occData[dataset].file);
        let json = await res.json();
        console.log(`getOccsFromFile(${occData[dataset].file}) RESULT:`, json);
        return json;
    } catch (err) {
        console.log(`getOccsFromFile(${occData[dataset].file}) ERROR:`, err);
        return new Error(err)
    }
}
/*
https://www.gbif.org/occurrence/search
?taxon_key=6953&taxon_key=5473&taxon_key=7017&taxon_key=9417&taxon_key=5481&taxon_key=1933999
&gadm_gid=USA.46_1
&year=2008,2022

https://www.gbif.org/occurrence/search
?taxon_key=6953&taxon_key=5473&taxon_key=7017&taxon_key=9417&taxon_key=5481&taxon_key=1933999
&state_province=Vermont&has_coordinate=false
&year=2008,2022

https://www.gbif.org/occurrence/search
?taxon_key=6953&taxon_key=5473&taxon_key=7017&taxon_key=9417&taxon_key=5481&taxon_key=1933999
&gadm_gid=USA.46_1
&year=1000,2002

https://www.gbif.org/occurrence/search
?taxon_key=6953&taxon_key=5473&taxon_key=7017&taxon_key=9417&taxon_key=5481&taxon_key=1933999
&state_province=Vermont&has_coordinate=false
&year=1000,2002
*/
