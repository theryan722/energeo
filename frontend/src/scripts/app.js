//Wrapper function for page init event to prevent event from firing when going back
function onPageInit(pagename, callback, initialonly = true) {
    $$(document).on('page:init', '.page[data-name="' + pagename + '"]', function (e) {
        if (initialonly) {
            if (e.detail.direction !== 'backward') {
                callback(e);
            }
        } else {
            callback(e);
        }
    });
}

$$(document).on('page:init', function (e) {
    if (app.device.desktop) {
        $$('.mobilemenubutton').hide();
    }
});

function validateZipCode(zipcode) {
    return /^\b\d{5}(-\d{4})?\b$/.test(zipcode);
}

onPageInit('home', function () {
    $$('#umap').hide();
    $$('.viewinfobtn').hide();
    runAnimation();
}, false);

function checkLocation() {
    runAnimation(true, true);
    let tpreloader = app.dialog.preloader('Evaluating location...');
    setTimeout(function () {
        let tzip = $$('input[name=zipcode]').val();
        if (validateZipCode(tzip)) {
            $$('#umap').show();
            $$('.mapbgimg').hide();
            $$('.viewinfobtn').show();
            GMaps.geocode({
                address: tzip,
                callback: function (results, status) {
                    if (status == 'OK') {
                        var latlng = results[0].geometry.location;
                        tmap = new GMaps({
                            el: '#umap',
                            lat: latlng.lat(),
                            lng: latlng.lng()
                        });

                        tmap.setCenter(latlng.lat(), latlng.lng());
                        tmap.addMarker({
                            lat: latlng.lat(),
                            lng: latlng.lng()
                        });
                    }
                    backendRequest(tzip, tpreloader);
                }
            });
        } else {
            runAnimation(true, false);
            tpreloader.close();
            app.toast.show({
                text: 'Please enter a valid zip code.'
            });
            return;
        }
    }, 1000);
}

function backendRequest(zip, zpreloader) {
    
    //app.sheet.open('.location-sheet');
    app.request.get('http://127.0.0.1:5000/query?location=' + zip, function (data) {
        let results = JSON.parse(data);
        console.log(results)
        let windbetter = false;
        
        if (results.wind.score > results.solar.score) {
            windbetter = true;
            $$('.results_wind_img').show();
            $$('.results_solar_img').hide();
            $$('.results_title').html('This area is best suited for wind power!');
        } else {
            $$('.results_wind_img').hide();
            $$('.results_solar_img').show();
            $$('.results_title').html('This area is best suited for solar power!');
        }
        app.popup.open('.popup-results');
        //====sheet
        let windgauge = app.gauge.create({
            el: '.windgauge',
            type: 'semicircle',
            borderColor: '#4285f4',
            value: results.wind.score / 100,
            valueText: Math.floor(results.wind.score) + '%',
            labelText: "Wind Score"
        });
        let solargauge = app.gauge.create({
            el: '.solargauge',
            type: 'semicircle',
            borderColor: '#4285f4',
            value: results.solar.score / 100,
            valueText: Math.floor(results.solar.score) + '%',
            labelText: "Solar Score"
        });
        console.log(results.other.wind_energy_savings);
        $$('.location_best').html('This location is better suited for ' + (windbetter ? 'wind power.' : 'solar power.'));
        $$('.savings_current').html('The current cost of electricity in this area is $' + results.other.current_elec_cost + ' per kWh.');
        $$('.savings_wind').html('You would save ' + results.other.wind_energy_savings.toString() + ' per kWh, bringing the cost of electricity down to ' + (results.other.current_elec_cost - results.other.wind_energy_savings) + ' per kWh.');
        $$('.savings_solar').html('You would save ' + results.other.solar_energy_savings.toString() + ' per kWh, bringing the cost of electricity down to ' + (results.other.current_elec_cost - results.other.solar_energy_savings) + ' per kWh.');
        //======
        runAnimation(true, false);
        zpreloader.close();
    }, function () {
        console.log('request error');
        app.toast.show({
            text: 'There was an error making the request.'
        });
        zpreloader.close();
    });
}
