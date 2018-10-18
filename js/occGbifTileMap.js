/*
jtl 10/17/2018
Leaflet experiment.
Goals:
- load vector tile map for species from GBIF and display in Leaflet (check)
- respond to a click over a point on vector tile and retrieve data (to-do)
*/


//USGS BISON wms coordinate system is only EPSG:3857
var llCenter = [43.6962, -72.3197];
var gbifTileLayer = {};
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
 Since the USGS coordinate system is only EPSG:3857 (Web Mercator), for all maps we
 use this projection.
*/
function addGbifRasterTileLayer() {
    var baseUrl = 'https://api.gbif.org/v2/map/occurrence/density/{z}/{x}/{y}';
    var format = '@Hx.png'; //@Hx.png, @1x.png, @2x.png, @3x.png, @4x.png
    var srs = '?srs=EPSG:3857'; //Spatial reference system. One of:
            /*
            EPSG:3857 (Web Mercator)
            EPSG:4326 (WGS84 plate careé)
            EPSG:3575 (Arctic LAEA)
            EPSG:3031 (Antarctic stereographic)
            */
    var style = ''; //'&style=purpleYellow.point'; //'&style=iNaturalist.poly';
    var taxon = '&taxonKey=2487805'; //Poecile atricapillus (black-capped chickadee)
    var country = ''; //'&country=USA';
    var gbifUrl = baseUrl + format + srs + style + taxon + country;

    document.getElementById("wmsUrlLabel").innerHTML = (gbifUrl);

    gbifTileLayer = L.tileLayer(gbifUrl).addTo(myMap);
}

/*
 * API documentation: https://leaflet.github.io/Leaflet.VectorGrid/vectorgrid-api-docs.html
 * Github: https://github.com/Leaflet/Leaflet.VectorGrid
 */
function addGbifVectorTileLayer() {
    var baseUrl = 'https://api.gbif.org/v2/map/occurrence/density/{z}/{x}/{y}';
    var format = '.mvt';
    var srs = '?srs=EPSG:3857'; //Spatial reference system. One of:
            /*
            EPSG:3857 (Web Mercator)
            EPSG:4326 (WGS84 plate careé)
            EPSG:3575 (Arctic LAEA)
            EPSG:3031 (Antarctic stereographic)
            */
    var taxon = '&taxonKey=2487805'; //Poecile atricapillus (black-capped chickadee)
    var country = ''; //'&country=USA';
    var gbifUrl = baseUrl + format + srs + taxon + country;

    document.getElementById("wmsUrlLabel").innerHTML = (gbifUrl);

    L.vectorGrid.protobuf(gbifUrl, {
        vectorTileLayerStyles: {
            /*
             * The only layer for GBIF .mvt vector tiles is 'occurrence'.
             */        
            occurrence: function(properties, zoom) {
                var rad = 1;
                switch (zoom) {
                    case 16:
                        rad = 5;
                        break;
                    case 15:
                        rad = 4;
                        break;
                    case 14:
                        rad = 3;
                        break;
                    case 13:
                        rad = 2;
                        break;
                    default:
                        rad = 1;
                }
                document.getElementById("zoomLabel").innerHTML = (`zoom: ${zoom}`);
                return {
                    radius: rad,
                    color: "red"
                };

            }
        }
    }).addTo(myMap);

    //L.vectorGrid.protobuf(gbifUrl).addTo(myMap);
}

function addMarker() {
    var marker = L.marker([43.6962, -72.3197]).addTo(myMap);
    marker.bindPopup("<b>Vermont Center for Ecostudies</b>").openPopup();
}

//standalone use
export function addMapAddGbifTile() {
    addMap();
    addMarker();
    //addGbifRasterTileLayer();
    addGbifVectorTileLayer();
}
//integrated use
export function getGbifTile(map) {
    myMap = map;
    //addGbifRasterTileLayer();
    addGbifVectorTileLayer();
}
