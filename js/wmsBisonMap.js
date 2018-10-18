/*
jtl 10/11/2018
Leaflet experiment.
Goals:
- load wms from BISON and display over Leaflet (check)
- load ocurrence location data as an array of points with data
- respond to a click over a point on a wms overlay and retrieve data
*/


//USGS BISON wms coordinate system is only EPSG:3857
var llCenter = [43.6962, -72.3197];
var imgOverlay = {};
var myMap = {};

function addMap() {
    myMap = L.map('mapid', {
            center: llCenter,
            zoom: 12,
            crs: L.CRS.EPSG3857
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
 USGS coordinate system is only EPSG:3857
 
 BBOX = Specifies the bounding box (minx, maxx, miny, maxy) of the image to be rendered
 Coordinates must be in Web Mercator (Spherical Mercator with WGS 1984 as the Datum)
 
 NOTE: The above description appears to be incorrect.  We altered the bbox values to be
 minx, miny, maxx, maxy, representing SW-corner and NE-corner of map, and it seems to work.
*/
function addBisonWmsOverlay() {
    var mapExt = getMapExtents();
    var baseUrl = 'https://bison.usgs.gov/api/wms';
    var layers = '?LAYERS=species';
    var nameType = '&type=' + document.querySelector('input[name="nameType"]:checked').value;//'&type=scientific_name';
    var name = '&species=' + document.getElementById("speciesName").value; //'Turdus migratorius';//'Apidae mellifora';
    var format = '&TRANSPARENT=true&FORMAT=image%2Fpng&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&STYLES=&SRS=EPSG%3A3857&';
    var bbox =  `BBOX=${mapExt.minx},${mapExt.miny},${mapExt.maxx},${mapExt.maxy}`; //our bbox is SW=bottom-left, NE=top-right
    var wid = `&WIDTH=${mapExt.pixwid}`;
    var hyt = `&HEIGHT=${mapExt.pixhyt}`;
    var bisonUrl = baseUrl + layers + nameType + name + format + bbox + wid + hyt;

    document.getElementById("wmsUrlLabel").innerHTML = (bisonUrl);

    if (myMap.hasLayer(imgOverlay)) {
        myMap.removeLayer(imgOverlay);
    }
    var imageBounds = [myMap.getBounds().getSouthWest(), myMap.getBounds().getNorthEast()];
    imgOverlay = L.imageOverlay(bisonUrl, imageBounds).addTo(myMap);
}

function getMapExtents() {
    var llmin = myMap.getBounds().getSouthWest();
    var xymin = toWebMercator(llmin.lat, llmin.lng);
    var llmax = myMap.getBounds().getNorthEast();
    var xymax = toWebMercator(llmax.lat, llmax.lng);
    return {
        pixwid: myMap.getSize().x,
        pixhyt: myMap.getSize().y,
        minx: xymin.x,
        miny: xymin.y,
        maxx: xymax.x,
        maxy: xymax.y
    };
}

/*
 * http://dotnetfollower.com/wordpress/2011/08/javascript-how-to-convert-latitude-and-longitude-to-mercator-coordinates/
 */
function toWebMercator(lat, lon) {
 
    var rMajor = 6378137; //Equatorial Radius, WGS84
    var shift  = Math.PI * rMajor;
    var x      = lon * shift / 180;
    var y      = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
    y = y * shift / 180;
 
    return {'x': x, 'y': y};
}

function addMarker() {
    var marker = L.marker([43.6962, -72.3197]).addTo(myMap);
    marker.bindPopup("<b>Vermont Center for Ecostudies</b>").openPopup();
}

function addEventCallbacks() {
myMap.on('load', function () {
    addBisonWmsOverlay();
});
myMap.on('zoomend', function () {
    addBisonWmsOverlay();
});
myMap.on('moveend', function () {
    addBisonWmsOverlay();
});
}

//standalone use
export function addMapAddBisonWms() {
    addMap();
    addMarker();
    addBisonWmsOverlay();
    addEventCallbacks();
}
//integrated use
export function getBisonWmsOverlay(map) {
    myMap = map;
    addBisonWmsOverlay();
}
