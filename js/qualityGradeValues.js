

/* The code in this script is used to provide realtime
 * graphics on the quality_grade observation status
 */
 var interval = 30000;
 var page_size = 200; //max is 200. do not exceed.
/*************************************************************/
//
//           FUNCTIONS TO GET TIME AND DATE
//
/*************************************************************/
function getStamp(offsetSecs=30) {
  const loc = moment(moment().valueOf() -  offsetSecs * 1000).format();
  const utc = moment(moment().valueOf() - offsetSecs * 1000).format();
  console.log(`getStamp | local: ${escape(loc)} | utc: ${utc}`);
  return escape(loc);
}

function currentTime(){
  const timenow = moment(moment().valueOf()).format()
  console.log(`Map last updated at: ${timenow}`);
  return timenow;
}

/************************************************************/
//
//             API queries
//
/************************************************************/
var iconicTaxon = ["Amphibia",
                   "Arachnida",
                   "Aves",
                   "Chromista",
                   "Fungi",
                   "Insecta",
                   "Mammalia",
                   "Mollusca",
                   "Reptilia",
                   "Plantae",
                   "Protozoa"];

var quality_type = ["research",
                    "casual",
                    "needs_id"]

//console.log(quality_type[0]);

// Function to write the url default is research grade
// Get the data for quality_grade observations
function researchObsURL(taxa="Plantae", grade="research"){
  var baseUrl = 'https://api.inaturalist.org/v1/observations';
  var quality_grade = "?quality_grade=" + grade;
  var getIconTaxon = '&iconic_taxa=' + taxa;
  var project = '&project_id=vermont-atlas-of-life';
  var identified = '&current=true';
  var order = '&order=desc&order_by=created_at';
  var iNatUrl = baseUrl + quality_grade + getIconTaxon + project + order;
  console.log('getResearchObs', iNatUrl);
  return(iNatUrl);
}

/* grabAllResearch uses the url generator and then
 * hits the initRequest function to get data for all
 * iconic taxon using a For loop
 */
function grabAllResearch(){
  // empty array to store data
const researchTots = [];
for (let i = 0; i < iconicTaxon.length; i++) {
var url_rs = researchObsURL(iconicTaxon[i]);
researchTots[i] = initRequest(url_rs)
}
return(researchTots);
}

/* grabAllResearch uses the url generator and then
 * hits the initRequest function to get data for all
 * iconic taxon using a For loop
 */
function grabAllNeedsId(){
  // empty array to store data
const needsIdTots = [];
for (let i = 0; i < iconicTaxon.length; i++) {
var url_ns = researchObsURL(iconicTaxon[i],quality_type[2]);
needsIdTots[i] = initRequest(url_ns)
}
return(needsIdTots);
}

/* Call the functions to get the data */
var r_grade = grabAllResearch();
var nid_grade = grabAllNeedsId();


console.log(`research_grade: ${r_grade[]}`);
console.log(`needs_id: ${nid_grade[]}`);

/* these functions are borrowed heavily from J. Loomis */
function initRequest(url, type=0) {
    var occXHR = new XMLHttpRequest();
    //handle request responses here in this callback
    occXHR.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            obsResults(this, url, type);
        } else if (this.status > 299) {
          console.log(`initRequest(${url} |  readyState: ${this.readyState} | status: ${this.status}`);
        }
    };
    //load the first page of data, which initiates subsequent page loads
    loadPage(occXHR, url, 1);
}

function loadPage(occXHR, url) {
    const uri = url
    console.log(`loadpage`, uri);
    occXHR.open("GET", uri, true);
    occXHR.responseType = 'json'; //looks like you need to add this after the open, and use 'reponse' above, not 'responseText'
    occXHR.setRequestHeader("Content-type", "application/json");
    occXHR.send();
}

async function obsResults(occXHR, url, type=1) {
    var jsonRes = occXHR.response; //JSON.parse(occXHR.response);
    var totr = jsonRes.total_results;
    var perp = jsonRes.per_page;
    var page = jsonRes.page;
    var obs = jsonRes.results;
      console.log(`totalObs: ${totr}`);
      loadPage(occXHR, url);
    return(totr);
}

/* I'm still a little fuzzy on this part */
/* I think this controls the time interval -
 i.e., do some function every new interval
 but I want it to do both research and needs_id */

 /*this isn't set up corretly as is */
function startData() {
  initRequest(1);
  intervalFn = window.setInterval(getData, interval);
}
