/*
10/22/2018
Leaflet experiment.
Goals:
- load a json array from GBIF and populate the map with point occurrence data
*/
var vceCenter = [43.6962, -72.3197]; //VCE coordinates
var vtCenter = [43.916944, -72.668056]; //VT geo center, downtown Randolph
var cmLayer = []; //an array of circleMarker 'layers' to keep track of for removal and deletion
var cmIndex = 0; //a global counter for cmLayer array-objects
var cmColor = {select:0, options:[{index:0, color:"blue", radius:10}, {index:1, color:"red", radius:7}, {index:2, color:"green", radius:3}]};
var myMap = {};
var myRenderer = L.canvas({ padding: 0.5 }); //make global so we can clear the canvas before updates...

function addMap() {
    var myMap = L.map('mapid', {
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
 * query GBIF occurrence API for json array of occurrence data
 *
 * add array of circleMarkers to canvas renderer...
*/
function addGbifOccCanvas() {
    var mapExt = getMapLlExtents();
    var baseUrl = 'http://api.inaturalist.org/v1/observations';
    var identified = '?identified=true';
    var taxon_name = '&taxon_name=' + document.getElementById("speciesName").value;
    var bbox = `&nelat=${mapExt.nelat}&nelng=${mapExt.nelng}&swlat=${mapExt.swlat}&swlng=${mapExt.swlng}`;
    var order = '&order=desc&order_by=created_at';
    var gbifUrl = baseUrl + identified + taxon_name + bbox + order;
    document.getElementById("apiUrlLabel").innerHTML = (gbifUrl);

    if (cmColor.select < 2) {cmColor.select++;} else {cmColor.select=0;}

    //remove all circleMarkers first...
    cmLayer.forEach(function(cm, index) {
        cm.remove(); //remove the marker from the map
        delete cmLayer[index]; //delete it from our index of markers
        cmIndex--;
        if (cmLayer.length < 1) {
            cmIndex = 0;
        }
    });

    //load the first 'page' of data, which initiates subsequent page loads
    loadPage(gbifUrl, 1, ajaxResults);
}

function loadPage(url, page, callback) {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            callback(this, url, page);
        }
    };
    xhttp.open("GET", url+`&page=${page}`, true);
    xhttp.responseType = 'json';  //looks like you need to add this after the open, and use 'reponse' above, not 'responseText'
    xhttp.setRequestHeader("Content-type", "application/json");
    xhttp.send();
}

function ajaxResults(xhttp, url, pageNext) {
    document.getElementById("apiUrlLabel").innerHTML = (url+`&page=${pageNext}`);
    var totr = xhttp.response.total_results;
    var page = xhttp.response.page;
    var perp = xhttp.response.per_page;
    var pages = Math.floor(totr / perp) + ((totr % perp)>0?1:0);
    //var count = cmIndex;
    //document.getElementById("jsonResults").innerHTML = `total results: ${count} / ${totr}  |  records/page: ${perp}  |  pages: ${page} / ${pages}`;
    document.getElementById("jsonResults").innerHTML = `total results: ${totr}  |  records/page: ${perp}  |  pages: ${page} / ${pages}`;
    updateMap(xhttp.response.results);
    if (xhttp.response.total_results > xhttp.response.page*xhttp.response.per_page) {
        loadPage(url, xhttp.response.page+1, ajaxResults);
    }
}

function updateMap(gbifJsonData) {

for (var i = 0; i < gbifJsonData.length; i += 1) {
    var llLoc = L.latLng(gbifJsonData[i].geojson.coordinates[1], gbifJsonData[i].geojson.coordinates[0]);
	cmLayer[cmIndex++] = L.circleMarker(llLoc, {
        renderer: myRenderer,
        radius: 3, //cmColor.options[cmColor.select].radius,
        color: "red" //cmColor.options[cmColor.select].color
      }).addTo(myMap).bindPopup(`
            Taxon Name: ${gbifJsonData[i].taxon.name||''}<br>
            Taxon Rank: ${gbifJsonData[i].taxon.rank||''}<br>
            ${gbifJsonData[i].description||''}<br>
            <a href="${gbifJsonData[i].uri||''}">${gbifJsonData[i].uri||''}</a><br>
            ${gbifJsonData[i].observed_on_string||''}<br>
            Quality/Grade: ${gbifJsonData[i].quality_grade||''}<br>
            `);
}

}
/*
 * iNat uses lat/lng bbox.  just get those from leaflet map and return as object.
 */
function getMapLlExtents() {
    var llne = myMap.getBounds().getNorthEast();
    var llsw = myMap.getBounds().getSouthWest();
    return {
        nelat: llne.lat,
        nelng: llne.lng,
        swlat: llsw.lat,
        swlng: llsw.lng
    };
}

function addMarker() {
    var marker = L.marker([43.6962, -72.3197]).addTo(myMap);
    marker.bindPopup("<b>Vermont Center for Ecostudies</b>").openPopup();
}

function addEventCallbacks() {
myMap.on('load', function () {
    addGbifOccCanvas();
});
myMap.on('zoomend', function () {
    addGbifOccCanvas();
});
myMap.on('moveend', function () {
    addGbifOccCanvas();
});
}

//standalone module usage
export function addMapGetGbifOcc() {
    addMap();
    //addMarker();
    addGbifOccCanvas();
    addEventCallbacks();
}
//integrated module usage
export function getGbifOccCanvas(map) {
    myMap = map;
    addGbifOccCanvas();
}
