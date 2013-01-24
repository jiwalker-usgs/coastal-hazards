package gov.usgs.cida.coastalhazards.parser;

import gov.usgs.cida.coastalhazards.wps.geom.IntersectionPoint;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.text.ParseException;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import org.apache.commons.io.FileUtils;
import org.geotools.feature.FeatureCollection;
import org.geotools.feature.FeatureIterator;
import org.n52.wps.io.data.binding.complex.PlainStringBinding;
import org.n52.wps.io.datahandler.parser.AbstractParser;
import org.opengis.feature.simple.SimpleFeature;

/**
 *
 * @author jiwalker
 */
public class IntersectionFeatureCollectionParser extends AbstractParser {
    
    public IntersectionFeatureCollectionParser() {
        super();
        supportedIDataTypes.add(PlainStringBinding.class);
    }

    @Override
    public PlainStringBinding parse(InputStream input, String mimetype, String schema) {
        StringBuilder builder = new StringBuilder();
        try {
            File tempFile = File.createTempFile(getClass().getSimpleName(), ".xml");
            FileUtils.copyInputStreamToFile(input, tempFile);
            FeatureCollection collection = new GMLStreamingFeatureCollection(tempFile);
            Map<Integer, List<IntersectionPoint>> map = new TreeMap<Integer, List<IntersectionPoint>>();
            FeatureIterator<SimpleFeature> features = collection.features();
            while (features.hasNext()) {
                SimpleFeature feature = features.next();
                int transectId = (Integer) feature.getAttribute("TransectID");

                IntersectionPoint intersection = new IntersectionPoint(
                        (Double) feature.getAttribute("Distance"),
                        (String) feature.getAttribute("Date_"),
                        (Double) feature.getAttribute("Uncy"));

                if (map.containsKey(transectId)) {
                    map.get(transectId).add(intersection);
                } else {
                    List<IntersectionPoint> pointList = new LinkedList<IntersectionPoint>();
                    pointList.add(intersection);
                    map.put(transectId, pointList);
                }
            }

            for (int key : map.keySet()) {
                List<IntersectionPoint> points = map.get(key);
                builder.append("# " + key);
                builder.append("\n");
                for (IntersectionPoint p : points) {
                    builder.append(p.toString());
                    builder.append("\n");
                }
            }
            
            return new PlainStringBinding(builder.toString());
        }
        catch (IOException e) {
            throw new RuntimeException("Error creating temporary file", e);
        }
        catch (ParseException e) {
            throw new RuntimeException("Unable to parse feature collection", e);
        }
    }
}
