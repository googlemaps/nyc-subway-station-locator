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
	"fmt"
	"math"

	rtree "github.com/dhconnelly/rtreego"
	geojson "github.com/paulmach/go.geojson"
	cluster "github.com/smira/go-point-clustering"
)

// The zoom level to stop clustering at
const minZoomLevelToShowUngroupedStations = 14

// Latitude of NYC, used to guestimate the size of a pixel at a specific
// zoom level.
const nycLatitude float64 = 40.7128

// Station marker image width.
const stationMarkerWidth float64 = 28

// EarthRadius is a rough estimate of earth's radius in km at latitude 0
// if earth was a perfect sphere.
const EarthRadius = 6378.137

// Point enables clustering over `Station`s.
func (s *Station) Point() cluster.Point {
	var p cluster.Point
	p[0] = s.feature.Geometry.Point[0]
	p[1] = s.feature.Geometry.Point[1]
	return p
}

func clusterStations(spatials []rtree.Spatial, zoom int) (*geojson.FeatureCollection, error) {
	var pl cluster.PointList

	for _, spatial := range spatials {
		station := spatial.(*Station)
		pl = append(pl, station.Point())
	}
	clusteringRadius, minClusterSize := getClusteringRadiusAndMinClusterSize(zoom)
	// The following operation groups stations determined to be nearby into elements of
	// "clusters". Some stations may end up not part of any cluster ("noise") - we
	// present these as individual stations on the map.
	clusters, noise := cluster.DBScan(pl, clusteringRadius, minClusterSize)
	fc := geojson.NewFeatureCollection()
	for _, id := range noise {
		f := spatials[id].(*Station).feature
		name, err := f.PropertyString("name")
		if err != nil {
			return nil, err
		}
		notes, err := f.PropertyString("notes")
		if err != nil {
			return nil, err
		}
		f.SetProperty("title", fmt.Sprintf("%v Station", name))
		f.SetProperty("description", notes)
		f.SetProperty("type", "station")
		fc.AddFeature(f)
	}
	for _, clstr := range clusters {
		ctr, _, _ := clstr.CentroidAndBounds(pl)
		f := geojson.NewPointFeature([]float64{ctr[0], ctr[1]})
		n := len(clstr.Points)
		f.SetProperty("title", fmt.Sprintf("Station Cluster #%v", clstr.C+1))
		f.SetProperty("description", fmt.Sprintf("Contains %v stations", n))
		f.SetProperty("type", "cluster")
		fc.AddFeature(f)
	}
	return fc, nil
}

func getClusteringRadiusAndMinClusterSize(zoom int) (float64, int) {
	// For highest zoom levels, consider stations 10 meters apart as
	// the same.  Allow for groups of size 2.
	if zoom >= minZoomLevelToShowUngroupedStations {
		return 0.01, 2
	}
	groundResolution := groundResolutionByLatAndZoom(nycLatitude, zoom)
	// Multiply ground resolution per pixel by the width (in pixels).. +
	// "manually adjust".
	clusteringRadius := groundResolution * stationMarkerWidth
	// Set min group size to 3
	return clusteringRadius, 3
}

// groundResolution indicates the distance in km on the ground that is
// represented by a single pixel in the map.
func groundResolutionByLatAndZoom(lat float64, zoom int) float64 {
	// number of pixels for the width of the (square) world map in web
	// mercator.  i.e. for zoom level 0, this would give 256 pixels.
	numPixels := math.Pow(2, float64(8+zoom))
	// We return earth's circumference (at given latitude) divided by
	// number of pixels for the map's width.  Note: EarthRadius is given in
	// km.
	return cos(lat) * 2 * math.Pi * EarthRadius / numPixels
}

// cos returns the cosine function (like math.cos) but accepts degrees as input.
func cos(degree float64) float64 {
	return math.Cos(degree * math.Pi / 180)
}
