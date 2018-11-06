/*
jtl 10/11/2018
Leaflet experiment.
Goals:
- load wms from BISON and display over Leaflet (check)
- load iNat ocurrence location data as an array of points with data (check)
- load wms from GBIF and display as Leaflet layer (check)
- separate back-ends into separate modules and import into central js manager (check)
- respond to a click over a point on a wms overlay and retrieve data (to-do)
*/

import {getInatOccCanvas} from "./occInatMap.js";
import {getBisonWmsOverlay} from "./wmsBisonMap.js";
import {getGbifTile} from "./occGbifTileMap.js";
import {getTaxonKey, getCanonicalName, getScientificName, getAllData} from "./gbifAutoComplete.js";
import {getValOccCanvas, testMarkers} from "./occValMap.js";

//USGS BISON wms coordinate system is only EPSG:3857
var vceCenter = [43.6962, -72.3197]; //VCE coordinates
var vtCenter = [43.916944, -72.668056]; //VT geo center, downtown Randolph
var valMap = {};
var layerControl = false;
var wmsBison = false; //flag to show a Bison WMS overlay map
var occInat = false; //flag to show an iNat JSON Occurrence vector map
var occGbifTile = false; //flag to add a GBIF vectorgrid tile layer
var occVal = true; //flag to add a VAL Data Portal map of occurrence vector data
var testHarness = document.getElementById("testHarness"); //flag for testing mode

function addMap() {
    valMap = L.map('mapid', {
            center: vtCenter,
            zoom: 8,
            crs: L.CRS.EPSG3857 //have to do this to conform to USGS maps
        });

    var light = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
        maxZoom: 20,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
            '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
            'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.light'
    }).addTo(valMap);
    
    var satellite = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
        maxZoom: 20,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
            '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
            'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.satellite'
    });
    
    var streets = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
        maxZoom: 20,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
            '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
            'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'
    });

    if(layerControl === false) {
        layerControl = L.control.layers().addTo(valMap);
    }

    layerControl.addBaseLayer(light, "Grayscale");
    layerControl.addBaseLayer(satellite, "Satellite");
    layerControl.addBaseLayer(streets, "Streets");
}

function addMarker() {
    var marker = L.marker([43.6962, -72.3197]).addTo(valMap);
    marker.bindPopup("<b>Vermont Center for Ecostudies</b>");
}

function getData() {
    if (wmsBison) {getBisonWmsOverlay(valMap);}
    if (occInat) {getInatOccCanvas(valMap);}
    if (occGbifTile) {getGbifTile(valMap, getTaxonKey());}  //NOTE: this gets a vector tile map, which scales/moves automagically.  event callback updates not needed.
    if (occVal) {getValOccCanvas(valMap, getCanonicalName());}
}

function zoomCenterMap() {
    valMap.setView(vtCenter, 8);
}

addMap();

valMap.on('zoomend', function () {
    if (wmsBison) {getBisonWmsOverlay(valMap);}
    if (occInat) {getInatOccCanvas(valMap);}
});
valMap.on('moveend', function () {
    if (wmsBison) {getBisonWmsOverlay(valMap);}
    if (occInat) {getInatOccCanvas(valMap);}
});

window.addEventListener("load", function() {

    // Add a listener to fetch data when user hits 'Enter' in autocomplete
    if (document.getElementById('gbif_autocomplete_name')) {
        document.getElementById('gbif_autocomplete_name').addEventListener("keyup", function(event) {
            if (event.key == "Enter") {
                getData();
            }
        });
    }

    // Add a listener to handle the 'Get Data' button click
    if (document.getElementById("getData")) {
        document.getElementById("getData").addEventListener("click", function() {
            getData();
        });
    }

    // Add a listener to handle the 'Zoom/Center' button click
    if (document.getElementById("zoomCtr")) {
        document.getElementById("zoomCtr").addEventListener("click", function() {
            zoomCenterMap();
        });
    }

    // Add a listener to handle the 'Text' button click
    if (document.getElementById("testHarness")) {
        document.getElementById("testHarness").addEventListener("click", function() {
            testMarkers(getCanonicalName());
        });
    }

});

if (testHarness) {
    getValOccCanvas(valMap, 'Bombus borealis');
}