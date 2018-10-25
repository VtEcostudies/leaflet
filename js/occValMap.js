/*
jtl 10/23/2018
Leaflet experiment.
Goals:
- load a json array from VAL Data Portal Ocurrence API and populate the map with point occurrence data
*/
import {getCanonicalName, getScientificName, getAllData} from "./gbifAutoComplete.js";
import {speciesList} from "./map_these_species.js";

var vceCenter = [43.6962, -72.3197]; //VCE coordinates
var vtCenter = [43.916944, -72.668056]; //VT geo center, downtown Randolph
var cmGroup = {}; //object of layerGroups of different species' markers grouped into layers
var cmCount = {}; //a global counter for cmLayer array-objects across mutiple species
var cgColor = {}; //object of colors for species layers
var colors = {0:"red",1:"blue",2:"green",3:"yellow",4:"purple",5:"grey"};
var myMap = {};
var myRenderer = L.canvas({ padding: 0.5 }); //make global so we can clear the canvas before updates...
var xhrRecsPerPage = 500; //the number of records to load per ajax request.  more is faster.
var vtWKT = "POLYGON((-73.3427 45.0104,-73.1827 45.0134,-72.7432 45.0153,-72.6100 45.0134,-72.5551 45.0075,-72.4562 45.0090,-72.3113 45.0037,-72.0964 45.0066,-71.9131 45.0070,-71.5636 45.0138,-71.5059 45.0138,-71.5294 44.9748,-71.4949 44.9123,-71.5567 44.8296,-71.6281 44.7506,-71.6061 44.7077,-71.5677 44.6481,-71.5388 44.5817,-71.6006 44.5533,-71.5746 44.5308,-71.5883 44.4955,-71.6556 44.4504,-71.7146 44.4093,-71.7957 44.3975,-71.8163 44.3563,-71.8698 44.3327,-71.9138 44.3484,-71.9865 44.3386,-72.0346 44.3052,-72.0428 44.2432,-72.0662 44.1930,-72.0360 44.1349,-72.0580 44.0698,-72.1101 44.0017,-72.0937 43.9671,-72.1252 43.9088,-72.1733 43.8682,-72.1994 43.7899,-72.1994 43.7899,-72.2392 43.7384,-72.3010 43.7056,-72.3271 43.6391,-72.3436 43.5893,-72.3793 43.5814,-72.3972 43.5027,-72.3807 43.4988,-72.3999 43.4150,-72.4123 43.3601,-72.3903 43.3591,-72.4081 43.3282,-72.3999 43.2762,-72.4370 43.2342,-72.4493 43.1852,-72.4480 43.1311,-72.4507 43.0679,-72.4438 43.0067,-72.4699 42.9846,-72.5276 42.9645,-72.5331 42.8951,-72.5633 42.8639,-72.5098 42.7863,-72.5166 42.7652,-72.4741 42.7541,-72.4590 42.7289,-73.2761 42.7465,-73.2912 42.8025,-73.2850 42.8357,-73.2678 43.0679,-73.2472 43.5022,-73.2561 43.5615,-73.2939 43.5774,-73.3049 43.6271,-73.3557 43.6271,-73.3976 43.5675,-73.4326 43.5883,-73.4285 43.6351,-73.4079 43.6684,-73.3907 43.7031,-73.3516 43.7701,-73.3928 43.8207,-73.3832 43.8533,-73.3969 43.9033,-73.4086 43.9365,-73.4134 43.9795,-73.4381 44.0427,-73.4141 44.1058,-73.3928 44.1921,-73.3427 44.2393,-73.3186 44.2467,-73.3406 44.3484,-73.3385 44.3690,-73.2946 44.4328,-73.3296 44.5367,-73.3832 44.5919,-73.3770 44.6569,-73.3681 44.7477,-73.3317 44.7857,-73.3324 44.8043,-73.3818 44.8398,-73.3564 44.9040,-73.3392 44.9181,-73.3372 44.9643,-73.3537 44.9799,-73.3447 45.0046,-73.3447 45.0109,-73.3426 45.0104,-73.3427 45.0104))";
//window.valXHR = new XMLHttpRequest();

//for standalone use
function addMap() {
    myMap = L.map('mapid', {
            center: vtCenter,
            zoom: 8,
            crs: L.CRS.EPSG3857 //have to do this to conform to USGS maps
        });

    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
        maxZoom: 20,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
            '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
            'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'
    }).addTo(myMap);
}

/*
 * Clear any markers from the map
 */
function initValOccCanvas() {
    console.log(`initValOccCanvas()`);
    cmCount = 0;
    //remove all circleMarkers from each group by clearing the layer
    Object.keys(cmGroup).forEach(function(key){
        console.log(`Clear layer '${key}'`);
        cmGroup[key].clearLayers(); 
    });
}

/*
 * query VAL Occ API for json array of occurrence data
 *
 * add array of circleMarkers to canvas renderer...
 *
*/
function addValOccCanvas(taxonName=null) {
    
    console.log(`addValOccCanvas(${taxonName})`);
    
    var baseUrl = 'http://vtatlasoflife.org/biocache-service/occurrences/search?q='; // biocache-service/occurrences/search?q=*:*
    var pageSize = `&pageSize=${xhrRecsPerPage}`;
    if (!taxonName) {taxonName = `taxon_name:${getCanonicalName()}`;}
    /*
    var lat = `&lat:`;
    var lon = `&lon:`;
    var radius = `&rad:10`;
    var valUrl = baseUrl + taxonName + pageSize + lat + lon + radius;
    */
    var wkt = `&wkt=${vtWKT}`;
    var valUrl = baseUrl + taxonName + pageSize + wkt;
    if(document.getElementById("apiUrlLabel")) {document.getElementById("apiUrlLabel").innerHTML = (valUrl);}

    // abort pending requests and start a new chain
    initXhrRequest(valUrl, taxonName);
}

function initXhrRequest(url, taxonName) {
    var valXHR = new XMLHttpRequest();
    
    // abort any pending requests on the global handle
    //valXHR.abort();
    
    console.log(`initXhrRequest(${url})`);

    //handle request responses here in this callback
    valXHR.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            xhrResults(this, url, taxonName);
        }
    };
    
    //load the first N records of data, which initiates subsequent page loads
    loadPage(valXHR, url, taxonName, 0);
}

function loadPage(valXHR, url, taxonName, startIndex) {
    valXHR.open("GET", url+`&startIndex=${startIndex}`, true);
    /*
     * NOTE: the VAL ala-demo site does not respond with a "Content-type" header.  We only get an "x-requested-with" pre-flight header
     * response.  This means we can't send a *request* having this header.
     * The two lines beloew, taken from the iNat code, asked the server to send us JSON.
     * For VAL, we let the reponse return as text and then we JSON.parse(response).
     */
    //valXHR.responseType = 'json';  //looks like you need to add this after the open, and use 'reponse' above, not 'responseText'
    //valXHR.setRequestHeader("Content-type", "application/json");
    valXHR.send();    
}

function xhrResults(valXHR, url, taxonName) {
    var jsonRes = JSON.parse(valXHR.response);
    var totr = jsonRes.totalRecords;
    var perp = jsonRes.pageSize;
    var startIdx = jsonRes.startIndex;
    var netr = startIdx + perp;
    if (netr > totr) {netr = totr;}
    if (document.getElementById("apiUrlLabel")) {document.getElementById("apiUrlLabel").innerHTML = (url+`&startIndex=${startIdx}`);}
    if (document.getElementById("jsonResults")) {
        document.getElementById("jsonResults").innerHTML = `total ${taxonName}: ${totr}  | ${taxonName} loaded: ${netr}`;
        }
    updateMap(jsonRes.occurrences, taxonName);
    if (totr > netr) {
        loadPage(valXHR, url, taxonName, netr+1);
    }
}

function updateMap(valJsonData, taxonName) {
    console.log(`updateMap(${valJsonData[0].species})`);
    for (var i = 0; i < valJsonData.length; i++) {
        if (!valJsonData[i].decimalLatitude || !valJsonData[i].decimalLongitude) {
            console.log(`WARNING: Occurrence Record without Lat/Lon values: ${valJsonData[i]}`);
            return;
        }
        cmCount[taxonName]++;
        cmCount['all']++;
        var llLoc = L.latLng(valJsonData[i].decimalLatitude, valJsonData[i].decimalLongitude);
        cmGroup[taxonName].addLayer(L.circleMarker(llLoc, {
            renderer: myRenderer,
            radius: 3,
            color: cgColor[taxonName]
          }).bindPopup(occurrencePopupInfo(valJsonData[i])));
    }
    
    if (document.getElementById("jsonResults")) {
        document.getElementById("jsonResults").innerHTML += ` | records mapped: ${cmCount['all']}`;
    }
}

function occurrencePopupInfo(occRecord) {
    var info = '';
    
    Object.keys(occRecord).forEach(function(key) {
        if (['scientificName','occurrenceID','dataProviderName','dataResourceName','Collector','basisOfRecord','date','year','month','day'].includes(key)) {
            info += `${key}: ${occRecord[key]}<br/>`;
        }
    });
    return info;    
}

function addMarker() {
    var marker = L.marker([43.6962, -72.3197]).addTo(myMap);
    marker.bindPopup("<b>Vermont Center for Ecostudies</b>");
}

//standalone module usage
function initValStandalone() {
    addMap();
    addMarker();
}

//integrated module usage
export function getValOccCanvas(map) {
    myMap = map;
    initValOccCanvas();
    addValOccCanvas();
}

//standalone module setup
if (document.getElementById("valStandalone")) {
    window.addEventListener("load", function() {
        
        initValStandalone();
        
        // Add a listener to handle the 'Get Data' button click
        document.getElementById("getData").addEventListener("click", function() {
            initValOccCanvas();
            addValOccCanvas();
        });
        
        // Add a listener to handle the 'Get Data' button click
        document.getElementById("getInfo").addEventListener("click", function() {
            var data = getAllData();
            var info = '';
            if (data) {
                Object.keys(data).forEach(function(key) {
                    info += `${key}: ${data[key]}` + String.fromCharCode(13);
                });
                alert(info);
            } else {
                alert('No Species Selected.');
            }
            //alert(getCanonicalName());
            //alert(getScientificName());
        });

    });
}
//valLoadOnOpen
if (document.getElementById("valLoadOnOpen")) {
    window.addEventListener("load", function() {

        initValStandalone();
        myMap.options.minZoom = 8;
        myMap.options.maxZoom = 12;
        //initValOccCanvas();
        //addValOccCanvas('Bombus borealis');
        getSpeciesListData();
        
        // Add a listener to handle the 'clear Data' button click
        if (document.getElementById("clearData")) {
            document.getElementById("clearData").addEventListener("click", function() {
                initValOccCanvas();
            });
        }
        
        // Add a listener to handle the 'Get Data' button click
        if (document.getElementById("getData")) {
            document.getElementById("getData").addEventListener("click", function() {
                getSpeciesListData();
            });
        }

    });
}

/*
 * add multiple species to map, loaded from imported .js file (see top of this file)
 * must be of the form {"species name": "name type"}
 */
function getSpeciesListData() {
    cmCount['all'] = 0;
    var i=0;
    var species = L.layerGroup([]);
    Object.keys(speciesList).forEach(function(key) {
        cmGroup[key] = L.layerGroup([]).addTo(myMap);
        species.addLayer(cmGroup[key]);
        cgColor[key] = colors[i++];
        cmCount[key] = 0;
        console.log(`Add species group ${key} with color ${cgColor[key]}`);
        addValOccCanvas(key);
    });
    var layers = {
        "Show Others": species
    };
    L.control.layers(cmGroup, layers).addTo(myMap);
}