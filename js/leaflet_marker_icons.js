
var dotIcon = L.Icon.extend({
		options: {
        //shadowUrl:  '/leaflet/js/dotShadow.png',
        iconSize:     [5, 5], // size of the icon
        //shadowSize:   [6, 6], // size of the shadow
        iconAnchor:   [5, 5], // point of the icon which will correspond to marker's location
        //shadowAnchor: [6, 6], // the same for the shadow
        popupAnchor:  [0, -5]  // point from which the popup should open relative to the iconAnchor
		}
	});

var redIcon = new dotIcon({iconUrl: '/leaflet/js/dotRed.png'}),
    orangeIcon = new dotIcon({iconUrl: '/leaflet/js/dotOrange.png'}),
    yellowIcon = new dotIcon({iconUrl: '/leaflet/js/dotYellow.png'}),
    greenIcon = new dotIcon({iconUrl: '/leaflet/js/dotGreen.png'}),
    blueIcon = new dotIcon({iconUrl: '/leaflet/js/dotBlue.png'}),
    violetIcon = new dotIcon({iconUrl: '/leaflet/js/dotViolet.png'});

var iconList = {
    0:redIcon,
    3:orangeIcon,
    5:yellowIcon,
    1:greenIcon,
    2:blueIcon,
    4:violetIcon
};

export {
    iconList
};