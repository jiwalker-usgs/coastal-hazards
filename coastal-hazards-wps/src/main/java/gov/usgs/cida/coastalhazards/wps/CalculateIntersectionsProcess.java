package gov.usgs.cida.coastalhazards.wps;

import com.vividsolutions.jts.geom.Geometry;
import com.vividsolutions.jts.geom.LineString;
import com.vividsolutions.jts.geom.MultiLineString;
import com.vividsolutions.jts.geom.MultiPoint;
import com.vividsolutions.jts.geom.Point;
import gov.usgs.cida.coastalhazards.util.CRSUtils;
import gov.usgs.cida.coastalhazards.util.UTMFinder;
import gov.usgs.cida.coastalhazards.wps.exceptions.UnsupportedCoordinateReferenceSystemException;
import gov.usgs.cida.coastalhazards.wps.exceptions.UnsupportedFeatureTypeException;
import java.util.LinkedHashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import org.geoserver.catalog.ProjectionPolicy;
import org.geoserver.wps.gs.GeoServerProcess;
import org.geoserver.wps.gs.ImportProcess;
import org.geotools.data.DataUtilities;
import org.geotools.data.simple.SimpleFeatureCollection;
import org.geotools.data.simple.SimpleFeatureIterator;
import org.geotools.feature.FeatureCollection;
import org.geotools.feature.simple.SimpleFeatureBuilder;
import org.geotools.feature.simple.SimpleFeatureTypeBuilder;
import org.geotools.geometry.jts.Geometries;
import org.geotools.geometry.jts.JTS;
import org.geotools.process.factory.DescribeParameter;
import org.geotools.process.factory.DescribeProcess;
import org.geotools.process.factory.DescribeResult;
import org.geotools.referencing.CRS;
import static gov.usgs.cida.coastalhazards.util.Constants.*;
import gov.usgs.cida.coastalhazards.util.LayerImportUtil;
import gov.usgs.cida.coastalhazards.wps.exceptions.LayerAlreadyExistsException;
import org.geoserver.catalog.Catalog;
import org.geoserver.catalog.LayerInfo;
import org.opengis.feature.simple.SimpleFeature;
import org.opengis.feature.simple.SimpleFeatureType;
import org.opengis.feature.type.AttributeType;
import org.opengis.feature.type.GeometryType;
import org.opengis.referencing.crs.CoordinateReferenceSystem;
import org.opengis.referencing.operation.MathTransform;

/**
 *
 * @author Jordan Walker <jiwalker@usgs.gov>
 */
@DescribeProcess(
        title = "Calculate Intersections",
description = "Create an intersection layer from the transects and shorelines, will currently only work for non-lidar data",
version = "1.0.0")
public class CalculateIntersectionsProcess implements GeoServerProcess {

    private LayerImportUtil importer;
    
    public CalculateIntersectionsProcess(ImportProcess importProcess, Catalog catalog) {
        this.importer = new LayerImportUtil(catalog, importProcess);
    }

    @DescribeResult(name = "intersections", description = "Layer containing intersections of shorelines and transects")
    public String execute(
            @DescribeParameter(name = "shorelines", description = "Array of shoreline feature collections to find intersects on", min = 1, max = 1) FeatureCollection<SimpleFeatureType, SimpleFeature> shorelines,
            @DescribeParameter(name = "transects", description = "Feature collection of transects", min = 1, max = 1) FeatureCollection<SimpleFeatureType, SimpleFeature> transects,
            @DescribeParameter(name = "farthest", description = "If there are multiple intersections should the farthest be taken (default false)", min = 0, max = 1) Boolean farthest,
            @DescribeParameter(name = "workspace", description = "Workspace in which to put resulting intersection", min = 1, max = 1) String workspace,
            @DescribeParameter(name = "store", description = "Store in which to put resulting intersection", min = 1, max = 1) String store,
            @DescribeParameter(name = "layer", description = "Layer name of resulting intersection", min = 1, max = 1) String layer) throws Exception {
        return new Process(shorelines, transects, farthest, workspace, store, layer).execute();
    }

    private class Process {
        // for each transect calculate intersections with coastlines
        // if it is a lidar dataset, need to get weighted average
        // retain identifiers of intersects or some sort
        // return Coordinate feature collection

        private FeatureCollection<SimpleFeatureType, SimpleFeature> shorelines;
        private FeatureCollection<SimpleFeatureType, SimpleFeature> transects;
        private boolean useFarthest;
        private String workspace;
        private String store;
        private String layer;
        private CoordinateReferenceSystem utmCrs;
        private Map<Long, Geometry> transectMap;
        private SimpleFeatureType outputFeatureType;
        private MathTransform shorelineTransform;
        private MathTransform transectTransform;

        private Process(FeatureCollection<SimpleFeatureType, SimpleFeature> shorelines,
                FeatureCollection<SimpleFeatureType, SimpleFeature> transects,
                Boolean farthest,
                String workspace,
                String store,
                String layer) {
            this.shorelines = shorelines;
            this.transects = transects;
            if (farthest == null) {
                this.useFarthest = false;
            } else {
                this.useFarthest = farthest;
            }
            this.workspace = workspace;
            this.store = store;
            this.layer = layer;

            this.transectMap = new LinkedHashMap<Long, Geometry>();

            this.outputFeatureType = null;
            this.shorelineTransform = null;
            this.transectTransform = null;
        }

        private String execute() throws Exception {
            importer.checkIfLayerExists(workspace, layer);

            CoordinateReferenceSystem shorelinesCrs = CRSUtils.getCRSFromFeatureCollection(shorelines);
            CoordinateReferenceSystem transectsCrs = CRSUtils.getCRSFromFeatureCollection(transects);
            if (!CRS.equalsIgnoreMetadata(shorelinesCrs, REQUIRED_CRS_WGS84)) {
                throw new UnsupportedCoordinateReferenceSystemException("Shorelines are not in accepted projection");
            }
//            if (!CRS.equalsIgnoreMetadata(baselineCrs, REQUIRED_CRS_WGS84)) {
//                throw new UnsupportedCoordinateReferenceSystemException("Baseline is not in accepted projection");
//            }
            SimpleFeatureCollection shorelineCollection = (SimpleFeatureCollection) shorelines;
            SimpleFeatureCollection transectCollection = (SimpleFeatureCollection) transects;
            this.utmCrs = UTMFinder.findUTMZoneForFeatureCollection(shorelineCollection);
            if (this.utmCrs == null) {
                throw new IllegalStateException("Must have usable UTM zone to continue");
            }

            this.outputFeatureType = buildSimpleFeatureType(shorelineCollection);

            this.shorelineTransform = CRS.findMathTransform(shorelinesCrs, utmCrs, true);
            this.transectTransform = CRS.findMathTransform(transectsCrs, utmCrs, true);
            
            SimpleFeatureType schema = transectCollection.getSchema();
            if (null == schema.getType(TRANSECT_ID_ATTR) || null == schema.getType(BASELINE_ORIENTATION_ATTR)) {
                StringBuilder build = new StringBuilder();
                build.append("Transect must have attributes: ")
                    .append(TRANSECT_ID_ATTR)
                    .append(" and ")
                    .append(BASELINE_ORIENTATION_ATTR);
                throw new UnsupportedFeatureTypeException(build.toString());
            }
            SimpleFeatureIterator transectIterator = transectCollection.features();
            long[] transectIds = new long[transectCollection.size()];
            int[] orientations = new int[transectCollection.size()];
            int idIndex = 0;
            
            // TODO this loop can be inside of the shoreline loop
            // I just have to cache any of the expensive operations
            // so they are not repeated
            while (transectIterator.hasNext()) {
                SimpleFeature feature = transectIterator.next();
                
                Object attrValue = feature.getAttribute(TRANSECT_ID_ATTR);
                Long id = null;
                if (attrValue instanceof Integer) {
                    id = new Long(((Integer)attrValue).longValue());
                }
                else if (attrValue instanceof Long) {
                    id = (Long)attrValue;
                }
                else {
                    throw new IllegalStateException("TransectID must be a Long or Integer type");
                }
                transectIds[idIndex] = id;
                
                int orient = (Integer) feature.getAttribute(BASELINE_ORIENTATION_ATTR);
                orientations[idIndex] = orient;
                idIndex++;
                
                Geometry transectGeom = (Geometry) feature.getDefaultGeometry();
                Geometry transformedGeom = JTS.transform(transectGeom, transectTransform);
                this.transectMap.put(id, transformedGeom);
            }

            SimpleFeatureIterator shoreIterator = shorelineCollection.features();
            List<SimpleFeature> sfList = new LinkedList<SimpleFeature>();
            while (shoreIterator.hasNext()) {
                SimpleFeature feature = shoreIterator.next();
                Geometry shoreGeom = (Geometry) feature.getDefaultGeometry();
                Geometry transformedGeom = JTS.transform(shoreGeom, shorelineTransform);
                for (int i=0; i< transectCollection.size(); i++) {
                    long transectId = transectIds[i];
                    int orientation = orientations[i];
                    Geometry transectGeom = transectMap.get(transectId);
                    Geometry intersection = transformedGeom.intersection(transectGeom);
                    Point point = getPointFromIntersection(intersection, transectGeom);
                    if (point == null) {
                        // no intersection, go to next transect
                        continue;
                    }
                    double distance = calculateDistanceFromReference(transectGeom, point, orientation);
                    SimpleFeature pointFeature = buildPointFeature(point, transectId, distance, feature);
                    sfList.add(pointFeature);
                }
            }
            SimpleFeatureCollection intersectionCollection = DataUtilities.collection(sfList);
            
            return importer.importLayer(intersectionCollection, workspace, store, layer, utmCrs, ProjectionPolicy.REPROJECT_TO_DECLARED);
        }
        
        private double calculateDistanceFromReference(Geometry transect, Point intersection, int orientation) {
            LineString line = null;
            switch(Geometries.get(transect)) {
                case MULTILINESTRING:
                    line = (LineString)transect.getGeometryN(0);
                    break;
                case LINESTRING:
                    line = (LineString)transect;
                    
                    break;
                default:
                    throw new UnsupportedFeatureTypeException("Expected LineString here");
            }
            
            Point referencePoint = line.getStartPoint();
            
            // distance should be calculated from coordinates, not points
            double distance = orientation *
                    referencePoint.getCoordinate().distance(
                    intersection.getCoordinate());
            
            return distance;
        }

        private SimpleFeatureType buildSimpleFeatureType(SimpleFeatureCollection simpleFeatures) {
            SimpleFeatureTypeBuilder builder = new SimpleFeatureTypeBuilder();
            SimpleFeatureType schema = simpleFeatures.getSchema();
            List<AttributeType> types = schema.getTypes();

            builder.setName("Intersections");
            builder.add("geom", Point.class, utmCrs);
            builder.add(TRANSECT_ID_ATTR, Integer.class);
            builder.add(DISTANCE_ATTR, Double.class);
            for (AttributeType type : types) {
                if (type instanceof GeometryType) {
                    // ignore the geom type of intersecting data
                } else {
                    builder.add(type.getName().getLocalPart(), type.getBinding());
                }
            }
            return builder.buildFeatureType();
        }
        
        private SimpleFeature buildPointFeature(Point point, long transectId, double distance, SimpleFeature sourceFeature) {
            List<AttributeType> types = this.outputFeatureType.getTypes();
            Object[] featureObjectArr = new Object[types.size()];
            for (int i =0; i<featureObjectArr.length; i++) {
                AttributeType type = types.get(i);
                if (type instanceof GeometryType) {
                    featureObjectArr[i] = point;
                }
                else if (type.getName().getLocalPart().equals(TRANSECT_ID_ATTR)) {
                    featureObjectArr[i] = new Long(transectId);
                }
                else if (type.getName().getLocalPart().equals(DISTANCE_ATTR)) {
                    featureObjectArr[i] = new Double(distance);
                }
                else {
                    featureObjectArr[i] = sourceFeature.getAttribute(type.getName());
                }
            }
            return SimpleFeatureBuilder.build(this.outputFeatureType, featureObjectArr, null);
        }

        private Point getPointFromIntersection(Geometry pointGeom, Geometry transect) {
            Geometries geomType = Geometries.get(pointGeom);
            Point point = null;
            switch (geomType) {
                case POLYGON:
                case MULTIPOLYGON:
                    throw new UnsupportedFeatureTypeException("Polygons should not occur in this geometry");
                case LINESTRING:
                case MULTILINESTRING:
                    throw new UnsupportedFeatureTypeException("Lines should not occur in this geometry");
                case POINT:
                    point = (Point) pointGeom;
                    break;
                case MULTIPOINT:
                    MultiPoint allPoints = (MultiPoint) pointGeom;
                    LineString transectLine = getSingleLineStringFromMultiLineString(transect);
                    Point start = transectLine.getStartPoint();
                    Point maxPoint = null;
                    double maxDistance = 0.0d;
                    Point minPoint = null;
                    double minDistance = Double.MAX_VALUE;
                    for (int i=0; i<allPoints.getNumGeometries(); i++) {
                        Point thisPoint = (Point) allPoints.getGeometryN(i);
                        double distance = start.distance(thisPoint);
                        if (this.useFarthest) {
                            if (distance > maxDistance) {
                                maxDistance = distance;
                                maxPoint = thisPoint;
                            }
                        }
                        else {
                            if (distance < minDistance) {
                                minDistance = distance;
                                minPoint = thisPoint;
                            }
                        }
                    }
                    point = (useFarthest) ? maxPoint : minPoint;
                    // need to decide which point
                    break;
                default:
                    // Probably empty, don't add this
                    point = null;
            }
            return point;
        }
        
        private LineString getSingleLineStringFromMultiLineString(Geometry lineStringGeom) {
            Geometries geomType = Geometries.get(lineStringGeom);
            switch (geomType) {
                case POLYGON:
                case MULTIPOLYGON:
                    throw new UnsupportedFeatureTypeException("Polygons should not occur in this geometry");
                case LINESTRING:
                    return (LineString) lineStringGeom;
                case MULTILINESTRING:
                    // just return first line string
                    MultiLineString mls = (MultiLineString) lineStringGeom;
                    return (LineString) mls.getGeometryN(0); // TODO improve this
                case POINT:
                case MULTIPOINT:
                    throw new UnsupportedFeatureTypeException("Points should not occur in this geometry");
                default:
                    throw new UnsupportedFeatureTypeException("Empty geometry not supported here");
            }
        }
    }
}
