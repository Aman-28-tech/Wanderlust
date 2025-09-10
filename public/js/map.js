// Configure API key
maptilersdk.config.apiKey = mapToken;

    // Initialize map
const map = new maptilersdk.Map({
    container: 'map',
    style: maptilersdk.MapStyle.STREETS, // streets style
    center: listing.geometry.coordinates, // [lng, lat]
    zoom: 9
});

//Add marker
new maptilersdk.Marker({color:"red"})
    .setLngLat(listing.geometry.coordinates)
    .setPopup(
        new maptilersdk.Popup({ offset: 25 })
            .setHTML(`
                    <h4>${listing.title}</h4>
                    <p>${listing.location}</p>
                `)
    )
    .addTo(map);
