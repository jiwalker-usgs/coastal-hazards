package gov.usgs.cida.coastalhazards.wps;

import com.vividsolutions.jts.algorithm.Angle;
import com.vividsolutions.jts.geom.Coordinate;
import com.vividsolutions.jts.geom.Geometry;
import com.vividsolutions.jts.geom.GeometryFactory;
import com.vividsolutions.jts.geom.LineSegment;
import com.vividsolutions.jts.geom.LineString;
import com.vividsolutions.jts.geom.MultiLineString;
import com.vividsolutions.jts.geom.Point;
import com.vividsolutions.jts.geom.PrecisionModel;
import com.vividsolutions.jts.geom.prep.PreparedGeometry;
import com.vividsolutions.jts.geom.prep.PreparedGeometryFactory;
import com.vividsolutions.jts.index.strtree.STRtree;
import gov.usgs.cida.coastalhazards.util.CRSUtils;
import static gov.usgs.cida.coastalhazards.util.Constants.*;
import gov.usgs.cida.coastalhazards.util.LayerImportUtil;
import gov.usgs.cida.coastalhazards.util.UTMFinder;
import gov.usgs.cida.coastalhazards.wps.exceptions.LayerAlreadyExistsException;
import gov.usgs.cida.coastalhazards.wps.exceptions.PoorlyDefinedBaselineException;
import gov.usgs.cida.coastalhazards.wps.exceptions.UnsupportedCoordinateReferenceSystemException;
import gov.usgs.cida.coastalhazards.wps.geom.ShorelineSTRTreeBuilder;
import gov.usgs.cida.coastalhazards.wps.geom.TransectVector;
import java.util.LinkedList;
import java.util.List;
import org.geoserver.catalog.Catalog;
import org.geoserver.catalog.LayerInfo;
import org.geoserver.catalog.ProjectionPolicy;
import org.geoserver.catalog.StoreInfo;
import org.geoserver.catalog.WorkspaceInfo;
import org.geoserver.wps.gs.GeoServerProcess;
import org.geoserver.wps.gs.ImportProcess;
import org.geotools.data.DataUtilities;
import org.geotools.data.simple.SimpleFeatureCollection;
import org.geotools.feature.FeatureCollection;
import org.geotools.feature.simple.SimpleFeatureBuilder;
import org.geotools.feature.simple.SimpleFeatureTypeBuilder;
import org.geotools.process.factory.DescribeParameter;
import org.geotools.process.factory.DescribeProcess;
import org.geotools.process.factory.DescribeResult;
import org.geotools.referencing.CRS;
import org.opengis.feature.simple.SimpleFeature;
import org.opengis.feature.simple.SimpleFeatureType;
import org.opengis.referencing.crs.CoordinateReferenceSystem;

/**
 *
 * @author Jordan Walker <jiwalker@usgs.gov>
 */
@DescribeProcess(
        title = "Generate Transects",
        description = "Create a transect layer from the baseline and shorelines",
        version = "1.0.0")
public class GenerateTransectsProcess implements GeoServerProcess {

    private LayerImportUtil importer;
    
    public GenerateTransectsProcess(ImportProcess importProcess, Catalog catalog) {
        this.importer = new LayerImportUtil(catalog, importProcess);
    }

    /** May actually want to return reference to new layer
     *  Check whether we need an offset at the start of the baseline
     */
    @DescribeResult(name = "transects", description = "Layer containing Transects normal to baseline")
    public String execute(
            @DescribeParameter(name = "shorelines", min = 1, max = 1) SimpleFeatureCollection shorelines,
            @DescribeParameter(name = "baseline", min = 1, max = 1) SimpleFeatureCollection baseline,
            @DescribeParameter(name = "spacing", min = 1, max = 1) Double spacing,
            @DescribeParameter(name = "workspace", min = 1, max = 1) String workspace,
            @DescribeParameter(name = "store", min = 1, max = 1) String store,
            @DescribeParameter(name = "layer", min = 1, max = 1) String layer) throws Exception {
        return new Process(shorelines, baseline, spacing, workspace, store, layer).execute();
    }
    
    protected class Process {
        private static final double MIN_TRANSECT_LENGTH = 50.0d; // meters
        private static final double TRANSECT_PADDING = 5.0d; // meters
        private static final double EARTH_RADIUS = 6378100.0d; // radius of earth
        
        private final FeatureCollection<SimpleFeatureType, SimpleFeature> shorelineFeatureCollection;
        private final FeatureCollection<SimpleFeatureType, SimpleFeature> baselineFeatureCollection;
        private final double spacing;
        private final String workspace;
        private final String store;
        private final String layer;
        
        private CoordinateReferenceSystem utmCrs;
        
        private final GeometryFactory geometryFactory;
        private SimpleFeatureType simpleFeatureType;
        private double guessTransectLength;
        private int transectId;
        
        protected Process(FeatureCollection<SimpleFeatureType, SimpleFeature> shorelines,
                FeatureCollection<SimpleFeatureType, SimpleFeature> baseline,
                double spacing,
                String workspace,
                String store,
                String layer) {
            this.shorelineFeatureCollection = shorelines;
            this.baselineFeatureCollection = baseline;
            this.spacing = spacing;
            this.workspace = workspace;
            this.store = store;
            this.layer = layer;
            
            this.geometryFactory = new GeometryFactory(new PrecisionModel(PrecisionModel.FLOATING));
            this.guessTransectLength = 500.0d; // start guess at .5km
            this.transectId = 0; // start ids at 0
        }
        
        protected String execute() throws Exception {
            importer.checkIfLayerExists(workspace, layer);
            
            CoordinateReferenceSystem shorelinesCrs = CRSUtils.getCRSFromFeatureCollection(shorelineFeatureCollection);
            CoordinateReferenceSystem baselineCrs = CRSUtils.getCRSFromFeatureCollection(baselineFeatureCollection);
            if (!CRS.equalsIgnoreMetadata(shorelinesCrs, REQUIRED_CRS_WGS84)) {
                throw new UnsupportedCoordinateReferenceSystemException("Shorelines are not in accepted projection");
            }
            if (!CRS.equalsIgnoreMetadata(baselineCrs, REQUIRED_CRS_WGS84)) {
                throw new UnsupportedCoordinateReferenceSystemException("Baseline is not in accepted projection");
            }
            this.utmCrs = UTMFinder.findUTMZoneForFeatureCollection((SimpleFeatureCollection)shorelineFeatureCollection);
            if (this.utmCrs == null) {
                throw new IllegalStateException("Must have usable UTM zone to continue");
            }
            
            SimpleFeatureTypeBuilder builder = new SimpleFeatureTypeBuilder();
            builder.setName("Transects");
            builder.add("geom", LineString.class, utmCrs);
            builder.add(TRANSECT_ID_ATTR, Integer.class);
            builder.add(BASELINE_ORIENTATION_ATTR, Integer.class);
            this.simpleFeatureType = builder.buildFeatureType();
            
            MultiLineString shorelineGeometry = CRSUtils.getLinesFromFeatureCollection(shorelineFeatureCollection, REQUIRED_CRS_WGS84, utmCrs);
            
            // TODO Will need to be able to pull seaward vs. shoreward from attrs (maybe Map<Integer, LineString>)
            // for now assume seaward
            MultiLineString baselineGeometry = CRSUtils.getLinesFromFeatureCollection(baselineFeatureCollection, REQUIRED_CRS_WGS84, utmCrs);
            TransectVector[] vectsOnBaseline = getEvenlySpacedOrthoVectorsAlongBaseline(baselineGeometry, shorelineGeometry, spacing);
            
            SimpleFeatureCollection resultingTransects = trimTransectsToFeatureCollection(vectsOnBaseline, shorelineGeometry);
            String layerName = importer.importLayer(resultingTransects, workspace, store, layer, utmCrs, ProjectionPolicy.REPROJECT_TO_DECLARED);
            return layerName;
        }

        protected TransectVector[] getEvenlySpacedOrthoVectorsAlongBaseline(MultiLineString baseline, MultiLineString shorelines, double spacing) {
            List<TransectVector> vectList = new LinkedList<TransectVector>();
            
            for (int i=0; i < baseline.getNumGeometries(); i++) {
                LineString line = (LineString)baseline.getGeometryN(i);
                int direction = shorelineDirection(line, shorelines);
                updateTransectLengthGuess(shorelines, line);
                vectList.addAll(handleLineString(line, spacing, direction));
            }
            TransectVector[] vectArr = new TransectVector[vectList.size()];
            return vectList.toArray(vectArr);
        }
        
        /**
         * 
         * @param vectsOnBaseline
         * @param baseline
         * @param shorelines
         * @return 
         */
        protected SimpleFeatureCollection trimTransectsToFeatureCollection(TransectVector[] vectsOnBaseline, MultiLineString shorelines) {
            if (vectsOnBaseline.length == 0) {
                return DataUtilities.collection(new SimpleFeature[0]);
            } 
            List<SimpleFeature> sfList = new LinkedList<SimpleFeature>();
            
            PreparedGeometry preparedShorelines = PreparedGeometryFactory.prepare(shorelines);
            STRtree tree = new ShorelineSTRTreeBuilder(shorelines).build();
            
            // add an extra 1k for good measure
            guessTransectLength += 1000.0d;
            
            for (TransectVector vect : vectsOnBaseline) {
                LineString testLine = vect.getLineOfLength(guessTransectLength);
                if (!preparedShorelines.intersects(testLine)) {
                    continue; // don't draw if it doesn't cross
                }
                List<LineString> lines = tree.query(testLine.getEnvelopeInternal());
                double maxDistance = MIN_TRANSECT_LENGTH;
                for (LineString line : lines) {
                    if (line.intersects(testLine)) {
                        // must be a point
                        Point intersection = (Point) line.intersection(testLine);
                        double distance = vect.getOriginCoord().distance(intersection.getCoordinate());
                        if (distance > maxDistance) {
                            maxDistance = distance;
                        }
                    }
                }
                LineString clipped = vect.getLineOfLength(maxDistance + TRANSECT_PADDING);
                // currently all vectors are assumed seaward, FYI
                SimpleFeature feature = createFeatureInUTMZone(clipped, vect.getOrientation());
                
                sfList.add(feature);
            }
            return DataUtilities.collection(sfList);
        }
        
        // Thought these would be longer, but I'll leave them here
        protected SimpleFeature createFeatureInUTMZone(LineString line, int orientation) {
            SimpleFeature feature = SimpleFeatureBuilder.build(this.simpleFeatureType,
                    new Object[]{line, new Integer(transectId), new Integer(orientation)}, null);
            transectId++;
            return feature;
        }

        /**
         * Vectors point 90&deg; counterclockwise currently
         * @param lineString line along which to get vectors
         * @param spacing how often to create vectors along line
         * @return List of fancy vectors I concocted
         */
        protected List<TransectVector> handleLineString(LineString lineString, double spacing, int orthoDirection) {
            Coordinate currentCoord = null;
            List<TransectVector> transectVectors = new LinkedList<TransectVector>();
            double accumulatedDistance = 0.0d;
            for (int i=0; i<lineString.getNumPoints(); i++) {
                Coordinate coord = lineString.getCoordinateN(i);
                if (currentCoord == null) {
                    currentCoord = coord;
                    Coordinate nextCoord = lineString.getCoordinateN(i+1);
                    if (nextCoord == null) {
                        throw new IllegalStateException("Line must have at least two points");
                    }
                    LineSegment segment = new LineSegment(currentCoord, nextCoord);
                    
                    // TODO here is where I need to set orientation
                    TransectVector vect = 
                            TransectVector.generatePerpendicularVector(currentCoord, segment, orthoDirection);
                    transectVectors.add(vect);
                    continue;
                }
                double distance = coord.distance(currentCoord);
                if ((accumulatedDistance + distance) > spacing) {
                    double distanceToNewPoint = spacing - accumulatedDistance;
                    double fraction = distanceToNewPoint / distance;
                    LineSegment segment = new LineSegment(currentCoord, coord);
                    
                    Coordinate pointAlong = segment.pointAlong(fraction);
                    
                    // TODO here too, should bet it from calling loop
                    TransectVector vect = 
                            TransectVector.generatePerpendicularVector(pointAlong, segment, orthoDirection);
                    transectVectors.add(vect);
                    
                    // this retries to next coordinate
                    currentCoord = pointAlong;
                    i--;
                    accumulatedDistance = 0.0d;
                }
                else {
                    accumulatedDistance += distance;
                    currentCoord = coord;
                }
            }
            return transectVectors;
        }
        
        /**
         * Gives direction to point transects as long as baseline is good
         * @param baseline
         * @param shorelines
         * @return 
         */
        protected int shorelineDirection(LineString baseline, Geometry shorelines) {
            Coordinate[] coordinates = baseline.getCoordinates();
            int n = coordinates.length;
            LineSegment a = new LineSegment(coordinates[0], coordinates[1]);
            LineSegment b = new LineSegment(coordinates[n-1], coordinates[n-2]);
            LineSegment m = null;
            if (n > 2) {
                m = new LineSegment(coordinates[(int)n/2], coordinates[(int)n/2+1]);
            }
            int[] counts = new int[] { 0, 0 };
            TransectVector vector =
                    TransectVector.generatePerpendicularVector(coordinates[0], a, Angle.CLOCKWISE);
            counts[0] += countIntersections(vector, shorelines);
            vector.rotate180Deg();
            counts[1] += countIntersections(vector, shorelines);
            
            vector = TransectVector.generatePerpendicularVector(coordinates[n-1], b, Angle.COUNTERCLOCKWISE);
            counts[0] += countIntersections(vector, shorelines);
            vector.rotate180Deg();
            counts[1] += countIntersections(vector, shorelines);
            
            if (m != null) {
                vector = TransectVector.generatePerpendicularVector(coordinates[(int)n/2], m, Angle.CLOCKWISE);
                counts[0] += countIntersections(vector, shorelines);
                vector.rotate180Deg();
                counts[1] += countIntersections(vector, shorelines);
            }
            
            if (counts[0] > counts[1]) {
                return Angle.CLOCKWISE;
            }
            else if (counts[0] < counts[1]) {
                return Angle.COUNTERCLOCKWISE;
            }
            throw new PoorlyDefinedBaselineException("Baseline is ambiguous, transect direction cannot be determined");
        }
        
        private int countIntersections(TransectVector vector, Geometry shorelines) {
            LineString line = vector.getLineOfLength(EARTH_RADIUS);
            Geometry intersection = line.intersection(shorelines);
            return intersection.getNumGeometries();
        }
        
        protected void updateTransectLengthGuess(MultiLineString shorelines, LineString baseline) {
            while (!shorelines.isWithinDistance(baseline.getStartPoint(), guessTransectLength) ||
                    !shorelines.isWithinDistance(baseline.getEndPoint(), guessTransectLength)) {
                guessTransectLength *= 2;
            }
        }
    }
}
