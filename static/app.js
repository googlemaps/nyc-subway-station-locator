/*
 * Copyright 2017 Google Inc. All rights reserved.
 *
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this
 * file except in compliance with the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF
 * ANY KIND, either express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

// Eslint configuration for editor.
/* globals google */
/* eslint-env browser */
/* eslint quotes: ["warn", "single"]*/

// Map Style for the basemap tiles.
const mapStyle = [
  {
    elementType: 'geometry',
    stylers: [
      {
        color: '#eceff1'
      }
    ]
  },
  {
    elementType: 'labels',
    stylers: [
      {
        visibility: 'off'
      }
    ]
  },
  {
    featureType: 'administrative',
    elementType: 'labels',
    stylers: [
      {
        visibility: 'off'
      }
    ]
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [
      {
        color: '#cfd8dc'
      }
    ]
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [
      {
        visibility: 'off'
      }
    ]
  },
  {
    featureType: 'road.local',
    stylers: [
      {
        visibility: 'off'
      }
    ]
  },
  {
    featureType: 'water',
    stylers: [
      {
        color: '#b0bec5'
      }
    ]
  }
];

// Colors from https://en.wikipedia.org/wiki/New_York_City_Subway_nomenclature#Colors_and_trunk_lines
const routeColors = {
  // IND Eighth Avenue Line
  A: '#2850ad',
  C: '#2850ad',
  E: '#2850ad',

  // IND Sixth Avenue Line
  B: '#ff6319',
  D: '#ff6319',
  F: '#ff6319',
  M: '#ff6319',

  // IND Crosstown Line
  G: '#6cbe45',

  // BMT Canarsie Line
  L: '#a7a9ac',

  // BMT Nassau Street Line
  J: '#996633',
  Z: '#996633',

  // BMT Broadway Line
  N: '#fccc0a',
  Q: '#fccc0a',
  R: '#fccc0a',
  W: '#fccc0a',

  // IRT Broadway – Seventh Avenue Line
  '1': '#ee352e',
  '2': '#ee352e',
  '3': '#ee352e',

  // IRT Lexington Avenue Line
  '4': '#00933c',
  '5': '#00933c',
  '6': '#00933c',

  // IRT Flushing Line
  '7': '#b933ad',

  // Shuttles
  S: '#808183'
};

// initMap is called from the Google Maps JS library after the library has initialised itself.
function initMap() {
  const map = new google.maps.Map(document.querySelector('#map'), {
    zoom: 12,
    center: {
      // New York City
      lat: 40.7305,
      lng: -73.9091
    },
    styles: mapStyle
  });
  const infowindow = new google.maps.InfoWindow();
  let stationDataFeatures = [];

  // Load GeoJSON for subway lines. Stations are loaded in the idle callback.
  map.data.loadGeoJson('/data/subway-lines');

  // Style the GeoJSON features (stations & lines)
  map.data.setStyle(feature => {
    const type = feature.getProperty('type');
    if (type === 'cluster') {
      // Icon path from: https://material.io/icons/#ic_add_circle_outline
      return {
        icon: {
          fillColor: '#00b0ff',
          strokeColor: '#3c8cb8',
          fillOpacity: 1.0,
          scale: 1.2,
          path: 'M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7zm-1-5C6.48 2 2 6.48 2 12s4' +
            '.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8' +
            's3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z'
        }
      };
    } else if (type === 'station') {
      // Icon path from: https://material.io/icons/#ic_train
      return {
        icon: {
          fillColor: '#00b0ff',
          strokeColor: '#3c8cb8',
          fillOpacity: 1.0,
          scale: 1.2,
          path: 'M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h2.2' +
            '3l2-2H14l2 2h2v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-3.58-' +
            '4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1' +
            '.5S8.33 17 7.5 17zm3.5-7H6V6h5v4zm2 0V6h5v4h-5zm3.5 7c-.83 0-1.5' +
            '-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z'
        }
      };
    }

    // if type is not a station or a cluster, it's a subway line
    const routeSymbol = feature.getProperty('rt_symbol');
    return {
      strokeColor: routeColors[routeSymbol]
    };
  });

  map.data.addListener('click', ev => {
    const f = ev.feature;
    const title = f.getProperty('title');
    const description = f.getProperty('description');

    if (!description) {
      return;
    }

    infowindow.setContent(`<b>${title}</b><br/> ${description}`);
    // Hat tip geocodezip: http://stackoverflow.com/questions/23814197
    infowindow.setPosition(f.getGeometry().get());
    infowindow.setOptions({
      pixelOffset: new google.maps.Size(0, -30)
    });
    infowindow.open(map);
  });

  // The idle callback is called every time the map has finished
  // moving, zooming,  panning or animating. We use it to load
  // Geojson for the new viewport.
  google.maps.event.addListener(map, 'idle', () => {
    const sw = map.getBounds().getSouthWest();
    const ne = map.getBounds().getNorthEast();
    const zm = map.getZoom();
    map.data.loadGeoJson(
      `/data/subway-stations?viewport=${sw.lat()},${sw.lng()}|${ne.lat()},${ne.lng()}&zoom=${zm}`,
      null,
      features => {
        stationDataFeatures.forEach(dataFeature => {
          map.data.remove(dataFeature);
        });
        stationDataFeatures = features;
      }
    );
  });
}
