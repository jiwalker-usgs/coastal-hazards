package gov.usgs.cida.coastalhazards.export;

import gov.usgs.cida.gml.GMLStreamingFeatureCollection;
import java.io.File;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.FileAlreadyExistsException;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import org.apache.commons.io.FileUtils;
import org.apache.commons.io.IOUtils;
import org.geotools.data.DataUtilities;
import org.geotools.data.DefaultTransaction;
import org.geotools.data.FileDataStoreFactorySpi;
import org.geotools.data.FileDataStoreFinder;
import org.geotools.data.Transaction;
import org.geotools.data.shapefile.ShapefileDataStore;
import org.geotools.data.simple.SimpleFeatureCollection;
import org.geotools.data.simple.SimpleFeatureIterator;
import org.geotools.data.simple.SimpleFeatureStore;
import org.geotools.feature.simple.SimpleFeatureBuilder;
import org.geotools.feature.simple.SimpleFeatureTypeBuilder;
import org.geotools.referencing.CRS;
import org.geotools.referencing.crs.DefaultGeographicCRS;
import org.opengis.feature.simple.SimpleFeature;
import org.opengis.feature.simple.SimpleFeatureType;
import org.opengis.feature.type.AttributeDescriptor;
import org.opengis.feature.type.FeatureType;
import org.opengis.feature.type.GeometryDescriptor;
import org.opengis.feature.type.Name;
import org.opengis.feature.type.PropertyDescriptor;
import org.opengis.referencing.FactoryException;
import org.opengis.referencing.crs.CoordinateReferenceSystem;

/**
 * This utility takes a feature collection and saves it to file in the 
 * specified location
 * 
 * @author Jordan Walker <jiwalker@usgs.gov>
 */
public class FeatureCollectionExport {
    
    public static final CoordinateReferenceSystem DEFAULT_CRS = DefaultGeographicCRS.WGS84;

    private SimpleFeatureCollection simpleFeatureCollection;
    private final File outputDirectory;
    private final String namePrefix;
    private List<String> attributes;
    private CoordinateReferenceSystem crs;
    private boolean downloadAll;
    public static final int NULL_PLACEHOLDER = -999;
    /**
     * Default constructor assumes all attributes from source should be downloaded
     * 
     * @param simpleFeatureCollection
     * @param outputDirectory
     * @param namePrefix 
     */
    public FeatureCollectionExport(SimpleFeatureCollection simpleFeatureCollection,
            File outputDirectory, String namePrefix) {
        this.simpleFeatureCollection = simpleFeatureCollection;
        this.outputDirectory = outputDirectory;
        this.namePrefix = namePrefix;
        this.attributes = new LinkedList<>();
        this.crs = DEFAULT_CRS;
        this.downloadAll = true;
    }
    
    /**
     * Alternate constructor allows client to specify specific attributes to download
     * 
     * @param simpleFeatureCollection
     * @param outputDirectory
     * @param namePrefix
     * @param downloadAll 
     */
    public FeatureCollectionExport(SimpleFeatureCollection simpleFeatureCollection,
            File outputDirectory, String namePrefix, boolean downloadAll) {
        this(simpleFeatureCollection, outputDirectory, namePrefix);
        this.downloadAll = downloadAll;
    }
    
    /**
     * Ignored if downloadAll is true
     * 
     * @param attrName 
     */
    public void addAttribute(String attrName) {
        if (attributeExists(attrName)) {
            attributes.add(attrName);
        } else {
            throw new RuntimeException("Attribute not found in feature collection");
        }
    }
    
    public void setCRS(CoordinateReferenceSystem crs) {
        throw new UnsupportedOperationException("Removing this option for now, will be able to reproject in future");
        //this.crs = crs;
    }
    
    public boolean writeToShapefile() throws MalformedURLException, IOException {
        boolean success = false;
        //SimpleFeatureIterator features = simpleFeatureCollection.features();
        SimpleFeatureType type = buildFeatureType();
        FileDataStoreFactorySpi factory = FileDataStoreFinder.getDataStoreFactory("shp");
        File shpFile = checkAndCreateFile(".shp");
        Map datastoreConfig = new HashMap<>();
        datastoreConfig.put("url", shpFile.toURI().toURL());
        ShapefileDataStore shpfileDataStore = (ShapefileDataStore)factory.createNewDataStore(datastoreConfig);
        shpfileDataStore.createSchema(type);
        shpfileDataStore.forceSchemaCRS(this.crs);
        //DataStore dataStore = factory.createNewDataStore(datastoreConfig);
        SimpleFeatureStore featureStore = (SimpleFeatureStore) shpfileDataStore.getFeatureSource(type.getName());
        Transaction t = new DefaultTransaction();
        SimpleFeatureIterator fi = null;
        try { 
            // Copied directly from Import process
            featureStore.setTransaction(t);
            fi = simpleFeatureCollection.features();
            SimpleFeatureBuilder fb = new SimpleFeatureBuilder(type);
            while (fi.hasNext()) {
                SimpleFeature source = fi.next();
                fb.reset();
                for (AttributeDescriptor desc : type.getAttributeDescriptors()) {
					Name attributeName = desc.getName();
					Object attributeValue = source.getAttribute(attributeName);
					if(null == attributeValue){
						attributeValue = NULL_PLACEHOLDER;
					}
                    fb.set(attributeName, attributeValue);
                }
                SimpleFeature target = fb.buildFeature(null);
                featureStore.addFeatures(DataUtilities.collection(target));
            }
            // successful if it made it this far
            success = true;
        } finally {
            t.commit();
            t.close();
            IOUtils.closeQuietly(fi);
        }
        return success;
    }
    public boolean writeToKmz() throws IOException{
		boolean success = false;
		SimpleFeatureType type = buildFeatureType();
		FileDataStoreFactorySpi factory = FileDataStoreFinder.getDataStoreFactory("kmz");
        File shpFile = checkAndCreateFile(".kmz");
        Map datastoreConfig = new HashMap<>();
        datastoreConfig.put("url", shpFile.toURI().toURL());
		return success;
	}
    private SimpleFeatureType buildFeatureType() {
        SimpleFeatureType featureType = null;
        SimpleFeatureTypeBuilder builder = new SimpleFeatureTypeBuilder();
        builder.setName(namePrefix);
        builder.setCRS(this.crs);
        builder.add(getGeometryDescriptor());
        if (downloadAll) {
            SimpleFeatureType unwrapped = GMLStreamingFeatureCollection.unwrapSchema(simpleFeatureCollection.getSchema());
            List<AttributeDescriptor> attributeDescriptors = unwrapped.getAttributeDescriptors();
            for (AttributeDescriptor attrDesc : attributeDescriptors) {
                builder.add(attrDesc);
            }
        } else {
            for (String name : attributes) {
                AttributeDescriptor descriptor = getDescriptorFromPrototype(name);
                if (descriptor != null) {
                    builder.add(descriptor);
                }
            }
        }
        featureType = builder.buildFeatureType();
        return featureType;
    }
    
    private AttributeDescriptor getDescriptorFromPrototype(String name) {
        SimpleFeatureType schema = simpleFeatureCollection.getSchema();
        AttributeDescriptor descriptor = schema.getDescriptor(name);
        return descriptor;
    }
    
    private GeometryDescriptor getGeometryDescriptor() {
        FeatureType schema = simpleFeatureCollection.getSchema();
        return schema.getGeometryDescriptor();
    }
    
    private boolean attributeExists(String attrName) {
        FeatureType schema = simpleFeatureCollection.getSchema();
        PropertyDescriptor descriptor = schema.getDescriptor(attrName);
        if (descriptor != null) {
            return true;
        }
        return false;
    }
    
    private File checkAndCreateFile(String extension) throws IOException {
        File file = null;
        if (!outputDirectory.exists()) {
            FileUtils.forceMkdir(outputDirectory);
        } else if (!outputDirectory.isDirectory()) {
            throw new IOException("outputDirectory must be a directory");
        } else {
            // good to go?
        }
        String fileName = namePrefix + extension;
        file = FileUtils.getFile(outputDirectory, fileName);
        if (file.exists()) {
            throw new FileAlreadyExistsException(fileName);
        }
        
        return file;
    }
}
