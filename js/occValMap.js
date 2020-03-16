/*
jtl 10/23/2018
Leaflet experiment.
Goals:
- load a json array from VAL Data Portal Occurrence API and populate the map with point occurrence data
*/
import {getCanonicalName, getScientificName, getAllData} from "./gbifAutoComplete.js";
import {colorsList, speciesList} from "./mapTheseSpecies.js";

var vceCenter = [43.6962, -72.3197]; //VCE coordinates
var vtCenter = [43.916944, -72.668056]; //VT geo center, downtown Randolph
var vtAltCtr = [43.858297, -72.446594]; //VT border center for the speciespage view, where px bounds are small and map is zoomed to fit
var zoomLevel = 8;
var zoomCenter = vtCenter;
var cmGroup = {}; //object of layerGroups of different species' markers grouped into layers
var cmCount = {}; //a global counter for cmLayer array-objects across mutiple species
var cmTotal = {}; //a global total for cmLayer counts across species
var cgColor = {}; //object of colors for separate species layers
var cmColors = {0:"#800000",1:"green",2:"blue",3:"yellow",4:"orange",5:"purple",6:"cyan",7:"grey"};
var cmRadius = zoomLevel/2;
var valMap = {};
var basemapLayerControl = false;
var boundaryLayerControl = false;
var speciesLayerControl = false;
var sliderControl = false;
var myRenderer = L.canvas({ padding: 0.5 }); //make global so we can clear the canvas before updates...
var xhrRecsPerPage = 1000; //the number of records to load per ajax request.  more is faster.
var totalRecords = 0;
var vtWKT = "POLYGON((-73.3427 45.0104,-73.1827 45.0134,-72.7432 45.0153,-72.6100 45.0134,-72.5551 45.0075,-72.4562 45.0090,-72.3113 45.0037,-72.0964 45.0066,-71.9131 45.0070,-71.5636 45.0138,-71.5059 45.0138,-71.5294 44.9748,-71.4949 44.9123,-71.5567 44.8296,-71.6281 44.7506,-71.6061 44.7077,-71.5677 44.6481,-71.5388 44.5817,-71.6006 44.5533,-71.5746 44.5308,-71.5883 44.4955,-71.6556 44.4504,-71.7146 44.4093,-71.7957 44.3975,-71.8163 44.3563,-71.8698 44.3327,-71.9138 44.3484,-71.9865 44.3386,-72.0346 44.3052,-72.0428 44.2432,-72.0662 44.1930,-72.0360 44.1349,-72.0580 44.0698,-72.1101 44.0017,-72.0937 43.9671,-72.1252 43.9088,-72.1733 43.8682,-72.1994 43.7899,-72.1994 43.7899,-72.2392 43.7384,-72.3010 43.7056,-72.3271 43.6391,-72.3436 43.5893,-72.3793 43.5814,-72.3972 43.5027,-72.3807 43.4988,-72.3999 43.4150,-72.4123 43.3601,-72.3903 43.3591,-72.4081 43.3282,-72.3999 43.2762,-72.4370 43.2342,-72.4493 43.1852,-72.4480 43.1311,-72.4507 43.0679,-72.4438 43.0067,-72.4699 42.9846,-72.5276 42.9645,-72.5331 42.8951,-72.5633 42.8639,-72.5098 42.7863,-72.5166 42.7652,-72.4741 42.7541,-72.4590 42.7289,-73.2761 42.7465,-73.2912 42.8025,-73.2850 42.8357,-73.2678 43.0679,-73.2472 43.5022,-73.2561 43.5615,-73.2939 43.5774,-73.3049 43.6271,-73.3557 43.6271,-73.3976 43.5675,-73.4326 43.5883,-73.4285 43.6351,-73.4079 43.6684,-73.3907 43.7031,-73.3516 43.7701,-73.3928 43.8207,-73.3832 43.8533,-73.3969 43.9033,-73.4086 43.9365,-73.4134 43.9795,-73.4381 44.0427,-73.4141 44.1058,-73.3928 44.1921,-73.3427 44.2393,-73.3186 44.2467,-73.3406 44.3484,-73.3385 44.3690,-73.2946 44.4328,-73.3296 44.5367,-73.3832 44.5919,-73.3770 44.6569,-73.3681 44.7477,-73.3317 44.7857,-73.3324 44.8043,-73.3818 44.8398,-73.3564 44.9040,-73.3392 44.9181,-73.3372 44.9643,-73.3537 44.9799,-73.3447 45.0046,-73.3447 45.0109,-73.3426 45.0104,-73.3427 45.0104))";
var stateLayer = false;
var countyLayer = false;
var townLayer = false;
var bioPhysicalLayer = false;
var testLayer = false;
//var kmlGroup = false; //this was global.  made it function scope so it's garbage collected.  global not necessary b/c it's used in one function.
var testHarness = false;
var testData = true;

//for standalone use
function addMap() {
    valMap = L.map('mapid', {
            zoomControl: false, //start with zoom hidden.  this allows us to add it below, in the location where we want it.
            center: vtAltCtr,
            zoom: 8,
            crs: L.CRS.EPSG3857 //have to do this to conform to USGS maps
        });

    new L.Control.Zoom({ position: 'bottomright' }).addTo(valMap);

    var attribLarge =  'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
            '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
            'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>';

    var attribSmall =  '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>, ' +
            '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
            '© <a href="https://www.mapbox.com/">Mapbox</a>';

    var streets = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
        maxZoom: 20,
        attribution: attribSmall,
        id: 'mapbox.streets'
    });

    var light = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
        maxZoom: 20,
        attribution: attribSmall,
        id: 'mapbox.light'
    });

    var satellite = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
        maxZoom: 20,
        attribution: attribSmall,
        id: 'mapbox.satellite'
    });

    var esriWorld = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        id: 'esri.world ',
        maxZoom: 20,
        attribution: 'Tiles &copy; Esri' // &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
      });

    var esriTopo = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
        id: 'esri.topo',
        maxZoom: 20,
        attribution: 'Tiles &copy; Esri' // &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
      });

    var openTopo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        id: 'open.topo',
        maxZoom: 17,
        attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
      });

    valMap.addLayer(streets);

    if(basemapLayerControl === false) {
        basemapLayerControl = L.control.layers().addTo(valMap);
    }

    basemapLayerControl.addBaseLayer(streets, "Mapbox Streets");
    basemapLayerControl.addBaseLayer(light, "Mapbox Grayscale");
    basemapLayerControl.addBaseLayer(satellite, "Mapbox Satellite");
    basemapLayerControl.addBaseLayer(esriWorld, "ESRI Imagery");
    basemapLayerControl.addBaseLayer(esriTopo, "ESRI Topo Map");
    basemapLayerControl.addBaseLayer(openTopo, "Open Topo Map");

    console.log('done adding basemaps');

    basemapLayerControl.setPosition("bottomright");

    valMap.on("zoomend", e => onZoomEnd(e));
    valMap.on("overlayadd", e => MapOverlayAdd(e));
}

function onZoomEnd(e) {
  zoomLevel = valMap.getZoom();
  zoomCenter = valMap.getCenter();
  SetEachPointRadius();
}

/*
 * https://github.com/mapbox/leaflet-omnivore
 */
async function addBoundaries() {

    if (boundaryLayerControl === false) {
        boundaryLayerControl = L.control.layers().addTo(valMap);
    } else {
        console.log('boundaryLayerControl already added.')
        return;
    }
    boundaryLayerControl.setPosition("bottomright");

/*
    console.log("addBoundaries (kml) ...");

    stateLayer = omnivore.kml('kml/LineString_VT_State_Boundary.kml');
    countyLayer = omnivore.kml('kml/LineString_VT_County_Boundaries.kml');
    townLayer = omnivore.kml('kml/LineString_VT_Town_Boundaries.kml');
    bioPhysicalLayer = omnivore.kml('kml/LineString_VT_Biophysical_Regions.kml');

    boundaryLayerControl.addOverlay(stateLayer, "State Boundary");
    boundaryLayerControl.addOverlay(countyLayer, "County Boundaries");
    boundaryLayerControl.addOverlay(townLayer, "Town Boundaries");
    boundaryLayerControl.addOverlay(bioPhysicalLayer, "Bio-physical Boundaries");

    kmlGroup = new L.FeatureGroup()
    kmlGroup.addLayer(stateLayer);
    kmlGroup.addLayer(countyLayer);
    kmlGroup.addLayer(townLayer);
    kmlGroup.addLayer(bioPhysicalLayer);

    //stateLayer.addTo(valMap);
    //countyLayer.addTo(valMap);
    //bioPhysicalLayer.addTo(valMap);
    //townLayer.addTo(valMap);
*/
/*
    //these will fail to work without warning. colors must be valid or the feature is blank.
    var stateGroup = L.geoJSON(null, {style: getStateStyle});
    function getStateStyle(feature) {return {color: 'purple', weight: 1};}
    var countyGroup = L.geoJSON(null, {style: getCountyStyle});
    function getCountyStyle(feature) {return {color: 'grey', weight: 1};}
    var townGroup = L.geoJSON(null, {style: getTownStyle});
    function getTownStyle(feature) {return {color: 'brown', weight: 1};}
    var bioPhysicalGroup = L.geoJSON(null, {style: getBioPhysicalStyle});
    function getBioPhysicalStyle(feature) {return {color: '#373737', weight: 1};}

    var prioritySurveyGroup = L.geoJSON(null, {style: getprioritySurveyStyle});
    function getprioritySurveyStyle(feature) {return {color: '#373737', weight: 1};}

    stateLayer = omnivore.kml('kml/LineString_VT_State_Boundary.kml', null, stateGroup);
    countyLayer = omnivore.kml('kml/LineString_VT_County_Boundaries.kml', null, countyGroup);
    townLayer = omnivore.kml('kml/LineString_VT_Town_Boundaries.kml', null, townGroup);
    bioPhysicalLayer = omnivore.kml('kml/LineString_VT_Biophysical_Regions.kml', null, bioPhysicalGroup);

    boundaryLayerControl.addOverlay(stateLayer, "State Boundary");
    boundaryLayerControl.addOverlay(countyLayer, "County Boundaries");
    boundaryLayerControl.addOverlay(townLayer, "Town Boundaries");
    boundaryLayerControl.addOverlay(bioPhysicalLayer, "Bio-physical Boundaries");

    countyLayer.addTo(valMap);
*/
    console.log("addBoundaries (geoJson) ...");
/*
    addGeoJsonLayer('geojson/LineString_VT_State_Boundary.geojson', "State Boundary", boundaryLayerControl);
    addGeoJsonLayer('geojson/LineString_VT_County_Boundaries.geojson', "County Boundaries", boundaryLayerControl);
    addGeoJsonLayer('geojson/LineString_VT_Town_Boundaries.geojson', "Town Boundaries", boundaryLayerControl);
    addGeoJsonLayer('geojson/LineString_VT_Biophysical_Regions.geojson', "Biophysical Regions", boundaryLayerControl);
*/
    addGeoJsonLayer('geojson/Polygon_VT_State_Boundary.geojson', "State Boundary", boundaryLayerControl);
    addGeoJsonLayer('geojson/Polygon_VT_County_Boundaries.geojson', "County Area", boundaryLayerControl, true);
    addGeoJsonLayer('geojson/Polygon_VT_Town_Boundaries.geojson', "Town Boundaries", boundaryLayerControl);
    addGeoJsonLayer('geojson/Polygon_VT_Biophysical_Regions.geojson', "Biophysical Regions", boundaryLayerControl);
}

/*
  Fired when an overlay is selected through a layer control.
  We send all overlay to the back so that point markers remain
  clickable, in the foreground.
*/
function MapOverlayAdd(e) {
  console.log('MapOverlayAdd', e);
  e.layer.bringToBack();
}

function addGeoJsonLayer(file="test.geojson", layerName="Test", layerControl=null, addToMap=false) {
  var layer = null;
  return new Promise(async (resolve, reject) => {
    loadGeoJSON(file, (data) => {
      layer = L.geoJSON(data, {
          onEachFeature: onEachFeature,
          style: onStyle
      });
      if (addToMap) {layer.addTo(valMap); layer.bringToBack();}
      if (layerControl) {layerControl.addOverlay(layer, layerName);}
      resolve(layer);
    });
  });
}

function loadGeoJSON(file, callback) {
  loadFile(file, (res) => {
    callback(JSON.parse(res));
  })
}

function loadFile(file, callback) {
    var xobj = new XMLHttpRequest();
        xobj.overrideMimeType("application/json");
    xobj.open('GET', file, true); // Replace 'my_data' with the path to your file
    xobj.onreadystatechange = function () {
          if (xobj.readyState == 4 && xobj.status == "200") {
            // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
            callback(xobj.responseText);
          } else {
            console.log(`loadFile | status: ${xobj.status} | readyState: ${xobj.readyState}`);
          }
    };
    xobj.send(null);
}

function onEachFeature(feature, layer) {
    layer.on('click', function (e) {
      /*
      if (feature.properties && feature.properties.CNTYNAME) {
        alert(feature.properties.CNTYNAME);
      }
      */
    });

    // does this feature have a property named popupContent?
    /*
    if (feature.properties && feature.properties.popupContent) {
        layer.bindPopup(feature.properties.popupContent);
    }
    */
    if (feature.properties) {
        var obj = feature.properties;
        var props = '';
        for (var key in obj) {
          switch(key.substr(key.length - 4)) {
            case 'NAME':
              props += `${key}: ${obj[key]}<br>`;
              break;
            case 'EOID':
              props += `${key}: ${obj[key]}<br>`;
              break;
          }
        }
        if (props) {layer.bindPopup(props);}
    }
}

function onStyle(feature) {
    switch (feature.properties.type) {
        case 'marker': return {color: "black"};
        case 'polygon': return {color: "yellow"};
        case 'linestring': return {color: "red"};
        default: return {color:"black", weight:1, fillOpacity:0.1, fillColor:"blue"};
    }
}

/*
 * https://github.com/dwilhelm89/LeafletSlider
 */
function addTimeSlider(taxonName) {
    var taxonGroup = cmGroup[taxonName];

    console.log(`addTimeSlider(${taxonName}) - layer.options: ${Object.keys(taxonGroup)}`);

    sliderControl = L.control.sliderControl({position: "bottomleft", layer: taxonGroup, range: true});
    valMap.addControl(sliderControl);
    sliderControl.startSlider();
}

/*
 * Clear any markers from the map
 */
function initValOccCanvas() {
    //console.log(`initValOccCanvas()`);
    cmCount['all'] = 0;
    //remove all circleMarkers from each group by clearing the layer
    Object.keys(cmGroup).forEach(function(key) {
        console.log(`Clear layer '${key}'`);
        cmGroup[key].clearLayers();
        console.log(`Remove control layer for '${key}'`);
        if (speciesLayerControl) speciesLayerControl.removeLayer(cmGroup[key]);
        delete cmGroup[key];
        delete cmCount[key];
        delete cmTotal[key];
        delete cgColor[key];
    });
    console.log(`Remove species layer control from map`);
    if (speciesLayerControl) {valMap.removeControl(speciesLayerControl);}
    speciesLayerControl = false;
}

function getTestData(file, taxonName) {
  //load test data
  loadGeoJSON(file, (data) => {
    updateMap(data.occurrences, taxonName);
  });
}

/*
 * query VAL Occ API for json array of occurrence data
 *
 * add array of circleMarkers to canvas renderer...
 *
*/
function addValOccCanvas(taxonName=false) {

    console.log(`addValOccCanvas(${taxonName})`);

    var baseUrl = 'https://biocache-ws.vtatlasoflife.org/occurrences/search'; //'http://vtatlasoflife.org/biocache-service/occurrences/search'; // biocache-service/occurrences/search?q=*:*
    var pageSize = `&pageSize=${xhrRecsPerPage}`;
    if (!taxonName) {taxonName = getCanonicalName();}
    var q = `?q=${taxonName}`; //this formation of the search appears to match to scientificName properly
    var fq = ``; //`&fq=year:2018&fq=basis_of_record:PreservedSpecimen`;
    /*
    var lat = `&lat:`;
    var lon = `&lon:`;
    var radius = `&rad:10`;
    var valUrl = baseUrl + taxonUrl + pageSize + lat + lon + radius;
    */
    var wkt = `&wkt=${vtWKT}`;
    var valUrl = baseUrl + q + fq + pageSize + wkt;
    if(document.getElementById("apiUrlLabel")) {document.getElementById("apiUrlLabel").innerHTML = (valUrl);}

    //console.log(`addValOccCanvas`, valUrl);

    // start a new chain of fetch events
    initXhrRequest(valUrl, taxonName);
}

function initXhrRequest(url, taxonName) {
    var valXHR = new XMLHttpRequest();

    //console.log(`initXhrRequest(${url})`);

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
     * NOTE: the VAL ALA site does not respond with a "Content-type" header.  We only get an
     * "x-requested-with" pre-flight header response.  This means we can't send a *request* having this header.
     * The two lines beloew, taken from the iNat code, asked the server to send us JSON.
     * For VAL, we let the reponse return as text and then we JSON.parse(response).
     */
    //valXHR.responseType = 'json';  //looks like you need to add this after the open, and use 'reponse' above, not 'responseText'
    //valXHR.setRequestHeader("Content-type", "application/json");
    valXHR.send();
}

function xhrResults(valXHR, url, taxonName) {
    var jsonRes = JSON.parse(valXHR.response);
    var totr = jsonRes.totalRecords; cmTotal[taxonName] = jsonRes.totalRecords;
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
    } else {
        valXHR.abort(); //does this clean up memory?
    }
}

function updateMap(valJsonData, taxonName) {
    //console.log(`updateMap(${taxonName})`);
    //console.log(`updateMap - cmGroup:`);
    //console.dir(cmGroup);
    for (var i = 0; i < valJsonData.length; i++) {
        //filter out records witout lat/lon location
        if (!valJsonData[i].decimalLatitude || !valJsonData[i].decimalLongitude) {
            console.log(`WARNING: Occurrence Record without Lat/Lon values: ${valJsonData[i]}`);
            return;
        }

        cmCount[taxonName]++;
        cmCount['all']++;

        //console.log(`${taxonName} | ${cmCount[taxonName]} | lat: ${valJsonData[i].decimalLatitude} | lon: ${valJsonData[i].decimalLongitude}`);

        var llLoc = L.latLng(valJsonData[i].decimalLatitude, valJsonData[i].decimalLongitude);

        var popup = L.popup({
            maxHeight: 200,
            keepInView: true,
        }).setContent(occurrencePopupInfo(valJsonData[i], cmCount[taxonName]));

        var marker = L.circleMarker(llLoc, {
            //renderer: myRenderer, //using this puts markers behind overlays. do we need it? We do not.
            fillColor: cgColor[taxonName], //interior color
            fillOpacity: 0.5, //values from 0 to 1
            color: "black", //border color
            weight: 1, //border thickness
            radius: cmRadius,
            index: cmCount[taxonName],
            occurrence: valJsonData[i].species,
            time: getDateYYYYMMDD(valJsonData[i].eventDate)
        }).bindPopup(popup); //(occurrencePopupInfo(valJsonData[i], cmCount[taxonName]));

        marker.bringToFront(); //this is not necessary, currently. can't hurt though.

        cmGroup[taxonName].addLayer(marker); //add this marker to the current layerGroup, which is an ojbect with possibly multiple layerGroups by taxonName

        if (testHarness) {
            marker.bindTooltip(`${cmCount[taxonName]}`, {opacity: 0.9});
        } else {
            if (valJsonData[i].eventDate) {
                marker.bindTooltip(`${taxonName}<br>${getDateYYYYMMDD(valJsonData[i].eventDate)}`);
            } else {
                marker.bindTooltip(`${taxonName}<br>No date supplied.`);
            }
        }
    }

    if (document.getElementById("jsonResults")) {
        document.getElementById("jsonResults").innerHTML += ` | records mapped: ${cmCount['all']}`;
    }

    var idTaxonName = taxonName.split(' ').join('_');

    if (document.getElementById(idTaxonName)) {
        document.getElementById(idTaxonName).innerHTML = `${taxonName} (${cmCount[taxonName]}/${cmTotal[taxonName]})`;
    }
}

/*
 * use moment to convert eventDate (which comes to us from VAL API as UTC epoch milliseconds with time *removed*, so
 * it's always time 00:00, and we cannot report time, only date) to a standard date format.
 *
 * return date in the format YYYY-MM-DD
 */
function getDateYYYYMMDD(msecs) {

    var m = moment.utc(msecs);

    return m.format('YYYY-MM-DD');
}

function getDateMMMMDoYYYY(msecs) {

    var m = moment.utc(msecs);

    return m.format('MMMM Do YYYY');
}

function occurrencePopupInfo(occRecord, index) {
    var info = '';

    if (testHarness) {info += `Map Index: ${index}<br/>`;}

    Object.keys(occRecord).forEach(function(key) {
        switch(key) {
            case 'raw_institutionCode':
                if ('iNaturalist' == occRecord[key]) {
                    info += `<a href="https://www.inaturalist.org/observations/${occRecord.occurrenceID}" target="_blank">iNaturalist Observation ${occRecord.occurrenceID} </a><br/>`;
/*                } else if ('BISON' == occRecord[key]) {
                    info += `<a href="https://bison.usgs.gov/api/search.jsonp?params=occurrenceID:${occRecord.occurrenceID}" target="_blank">BISON Observation ${occRecord.occurrenceID}</a><br/>`;
*/                } else {
                    info += `Institution: ${occRecord[key]}<br/>`;
                }
                break;
            case 'uuid':
                info += `<a href="https://biocache.vtatlasoflife.org/occurrences/${occRecord[key]}" target="_blank">VAL Data Explorer Occurrence Record </a><br/>`;
                break;
            case 'decimalLatitude':
                info += `Lat: ${occRecord[key]}`;
                break;
            case 'decimalLongitude':
                info += `, Lon: ${occRecord[key]}<br/>`;
                break;
            case 'scientificName':
                info += `Scientific Name: ${occRecord[key]}<br/>`;
                break;
            case 'collector':
                info += `Collector: ${occRecord[key]}<br/>`;
                break;
            case 'basisOfRecord':
                info += `Basis of Record: ${occRecord[key]}<br/>`;
                break;
            case 'eventDate':
                var msecs = occRecord[key]; //epoch date in milliseconds at time 00:00
                //var m = moment.utc(msecs); //convert to UTC. otherwise moment adjusts for locale and alters date to UTC-date-minus-locale-offset.
                //info += `Event Date: ${m.format('MMMM Do YYYY')}<br/>`;
                info += `Event Date: ${getDateMMMMDoYYYY(msecs)}<br/>`;
                break;
            case '':
                info += `: ${occRecord[key]}<br/>`;
                break;
            default: //un-comment this to list all properties
                //info += `${key}: ${occRecord[key]}<br/>`;
            }
        });

    return info;
}

//iterate through all plotted pools in each featureGroup and alter each radius
function SetEachPointRadius(radius = cmRadius) {
  cmRadius = Math.floor(zoomLevel/2);
  Object.keys(cmGroup).forEach((taxonName) => {
    cmGroup[taxonName].eachLayer((cmLayer) => {
      cmLayer.setRadius(radius);
      cmLayer.bringToFront(); //this works, but only when this function is called
    });
  });
}

function addMarker() {
    var marker = L.marker([43.6962, -72.3197]).addTo(valMap);
    marker.bindPopup("<b>Vermont Center for Ecostudies</b>");
}

//standalone module usage
function initValStandalone() {
    addMap();
    addMapCallbacks();
    if (!boundaryLayerControl) {addBoundaries();}
}

//integrated module usage
export function getValOccCanvas(map, taxonName) {
    valMap = map;

    if (taxonName) {
        addMapCallbacks();
        initValOccCanvas();
        cmGroup[taxonName] = L.layerGroup().addTo(valMap); //create a new, empty, single-species layerGroup to be populated from API
        cgColor[taxonName] = cmColors[0];
        cmCount[taxonName] = 0;
        cmTotal[taxonName] = 0;
        addValOccCanvas(taxonName);
        if (!boundaryLayerControl) {addBoundaries();}
        //if (!sliderControl) {addTimeSlider(taxonName);}
        if (!speciesLayerControl) {
            speciesLayerControl = L.control.layers().addTo(valMap);
            var idTaxonName = taxonName.split(' ').join('_');
            speciesLayerControl.addOverlay(cmGroup[taxonName], `<span id=${idTaxonName}>${taxonName}</span>`);
            speciesLayerControl.setPosition("bottomright");
        }
    } else {
        initValOccCanvas();
    }
}

/*
 * Standalone module setup
 *
 * Required html element where id="valStandalone"
 */
if (document.getElementById("valStandalone")) {
    window.addEventListener("load", function() {

        initValStandalone();

        // Add a listener to handle the 'Get Data' button click
        document.getElementById("getData").addEventListener("click", function() {
            initValOccCanvas();
            if (testData) {
              const taxonName = 'TestData';
              cmGroup[taxonName] = L.layerGroup().addTo(valMap); //create a new, empty, single-species layerGroup to be populated from API
              cgColor[taxonName] = cmColors[0];
              getTestData('../testData/testData.json', taxonName);
            } else {
              const taxonName = getCanonicalName();
              cmGroup[taxonName] = L.layerGroup().addTo(valMap); //create a new, empty, single-species layerGroup to be populated from API
              addValOccCanvas();
            }
        });

        // Add a listener to handle the 'Get Species Info' button click
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
/*
 * Minimal (map-only) standalone use
 *
 * Requires html element where id="valLoadOnOpen"
 *
 */
if (document.getElementById("valLoadOnOpen")) {
    window.addEventListener("load", function() {

        var urlLoad = window.location.toString();
        urlLoad = decodeURI(urlLoad);
        var speciesStr = urlLoad.substring(urlLoad.lastIndexOf("=")+1);
        console.log(`url-parsed species string: ${speciesStr}`);
        var speciesObj = {};
        try {
          speciesObj = JSON.parse(speciesStr);
          console.log('species object:', speciesObj)
        } catch(error) {
          console.log('ERROR parsing http arugment', speciesStr, 'as JSON:', error);
          alert('Please pass species as object literal like [map-page-url]?species={"Turdus migratorius":"#800000"}');
        }

        initValStandalone();
        valMap.options.minZoom = 8;
        valMap.options.maxZoom = 17;
        //initValOccCanvas();
        //addValOccCanvas('Bombus borealis');
        if (!boundaryLayerControl) {addBoundaries();}
        if (typeof speciesObj != "object") {
            alert('Please pass an object literal like [map-page-url]?species={"Turdus migratorius":"#800000"}');
        } else {
            getSpeciesListData(speciesObj);
        }

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
 * Add multiple species to map, either passed as an argument or loaded from imported .js file (see top of this file)
 *
 * argSpecies or speciesList must be of the form {"species name": "color", "species name": "color", ...}, and the
 * JSON values must be in double quotes.
 */
function getSpeciesListData(argSpecies = false) {
    cmCount['all'] = 0;
    var i=0;

    if (!speciesLayerControl) {
        speciesLayerControl = L.control.layers().addTo(valMap);
        speciesLayerControl.setPosition("bottomright");
    }

    if (!argSpecies) {
        argSpecies = speciesList;
    }

    Object.keys(argSpecies).forEach(function(taxonName) {
        cmGroup[taxonName] = L.layerGroup().addTo(valMap); //create a new, empty, single-species layerGroup to be populated from API
        cgColor[taxonName] = argSpecies[taxonName]; //define circleMarker color for each species mapped
        cmCount[taxonName] = 0;
        cmTotal[taxonName] = 0;
        console.log(`Add species group ${taxonName} with color ${cgColor[taxonName]}`);
        addValOccCanvas(taxonName);
        var idTaxonName = taxonName.split(' ').join('_');
        speciesLayerControl.addOverlay(cmGroup[taxonName], `<span id=${idTaxonName}>${taxonName}</span>`);
        i++;
    });
}

function addMapCallbacks() {
    /*
     * This event is triggered for each 'layeradd', which in our case is for each circleMarker.
     * Doing anything here has major performance hit.
     */
/*
    valMap.on('layeradd', function (event) {
*/
    valMap.on('zoomend', function () {
        console.log(`Map Zoom: ${valMap.getZoom()}`);
    });
    valMap.on('moveend', function() {
        console.log(`Map Center: ${valMap.getCenter()}`);
    });

}

/*
 * Test the map by counting the markers for a taxonName.  This depends upon adding custom
 * options to each marker called 'index' and 'occurrence'.
 * - Count the markers
 * - Verify proper data
 * - Step through each datapoint and toggle its popup
 */
export function testMarkers(taxonName) {
    valMap.eachLayer(function(layer) {
        if ('occurrence' in layer.options) {
            console.log(layer.options.occurrence + ':' + layer.options.index);
            //layer.openTooltip();
            layer.openPopup();
            alert(layer.options.occurrence + ':' + layer.options.index);
            layer.closeTooltip();
        }
    });
}
