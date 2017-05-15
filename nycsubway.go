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

package nycsubway

import (
	"io/ioutil"
	"log"
	"net/http"
	"path/filepath"
)

// GeoJSON is a cache of the NYC Subway Station and Line data.
var GeoJSON = make(map[string][]byte)

// cacheGeoJSON loads files under data into `GeoJSON`.
func cacheGeoJSON() {
	filenames, err := filepath.Glob("data/*")
	if err != nil {
		// Note: this will take down the GAE instance by exiting this process.
		log.Fatal(err)
	}
	for _, f := range filenames {
		name := filepath.Base(f)
		dat, err := ioutil.ReadFile(f)
		if err != nil {
			log.Fatal(err)
		}
		GeoJSON[name] = dat
	}
}

// init is called from the App Engine runtime to initialize the app.
func init() {
	cacheGeoJSON()
	loadStations()
	http.HandleFunc("/data/subway-stations", subwayStationsHandler)
	http.HandleFunc("/data/subway-lines", subwayLinesHandler)
}

func subwayLinesHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-type", "application/json")
	w.Write(GeoJSON["subway-lines.geojson"])
}
