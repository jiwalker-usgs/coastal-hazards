package gov.usgs.cida.coastalhazards.wps;

import gov.usgs.cida.coastalhazards.util.FeatureCollectionFromShp;
import gov.usgs.cida.coastalhazards.util.LayerImportUtil;
import java.io.File;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.List;
import org.geoserver.catalog.ProjectionPolicy;
import org.geoserver.wps.WPSTestSupport;

import org.geoserver.wps.gs.ImportProcess;
import org.geotools.data.simple.SimpleFeatureCollection;
import static org.junit.Assert.*;
import org.junit.BeforeClass;
import org.junit.Test;
import org.opengis.feature.simple.SimpleFeatureType;
import org.opengis.feature.type.AttributeDescriptor;
import org.opengis.feature.type.Name;

public class NormalizeLayerColumnNamesProcessTest  extends WPSTestSupport {

	private static File outTest = null;

	public static final String WORKSPACE_NAME = "gs";
	public static final String LAYER_NAME = "myLayerName";
	public static final String STORE_NAME = "myStoreName";

	@BeforeClass
	public static void setupAll() throws IOException {
		// leaks files, need to delete all the files associated with .shp
		outTest = File.createTempFile("test", ".shp");
		outTest.deleteOnExit();
	}

	@Test
	public void testExecute() throws Exception {
		ImportProcess dummyImportProcess = new DummyImportProcess(outTest);
		
		//inspiration: http://www.torres.at/geoserver-create-datastore-programmatically/
		URL mixedCaseShapefile = NormalizeLayerColumnNamesProcessTest.class.getClassLoader().getResource("gov/usgs/cida/coastalhazards/mixedCaseColumnNames/mixedCaseColumnNames.shp");
		String namespaceUri = "http://www.cida.usgs.gov/";
		String namespace = "cida";
		SimpleFeatureCollection mixedCaseFeatureCollection = (SimpleFeatureCollection) FeatureCollectionFromShp.featureCollectionFromShp(mixedCaseShapefile);

		AutoImportProcess autoImportProcess = new AutoImportProcess(catalog);
	
		LayerImportUtil importer = new LayerImportUtil(catalog, autoImportProcess);
		String response = importer.importLayer(mixedCaseFeatureCollection, WORKSPACE_NAME, STORE_NAME, LAYER_NAME, mixedCaseFeatureCollection.getSchema().getGeometryDescriptor().getCoordinateReferenceSystem(), ProjectionPolicy.REPROJECT_TO_DECLARED);

		NormalizeLayerColumnNamesProcess normalizeLayerColumnNamesProcess = new NormalizeLayerColumnNamesProcess(dummyImportProcess, catalog);
		String normalizeResult = normalizeLayerColumnNamesProcess.execute(LAYER_NAME, WORKSPACE_NAME, STORE_NAME);
		System.out.println("The following renaming was attempted (oldName|newName):");
		System.out.println(normalizeResult);
		validateColumnNames(outTest);
	}

	private void validateColumnNames(File shapefile) throws MalformedURLException, IOException {
		SimpleFeatureCollection resultsFC = (SimpleFeatureCollection) FeatureCollectionFromShp.featureCollectionFromShp(shapefile.toURI().toURL());

		SimpleFeatureType resultsFeatureType = resultsFC.getSchema();
		List<AttributeDescriptor> attributeDescriptors = resultsFeatureType.getAttributeDescriptors();
		assertFalse(attributeDescriptors.isEmpty());
		for (AttributeDescriptor ad : attributeDescriptors) {
			Name attributeName = ad.getName();
			String actualName = attributeName.toString();
			if(!NormalizeLayerColumnNamesProcess.COLUMN_NAMES_TO_IGNORE.contains(actualName)){
				String upperCasedName = actualName.toUpperCase();
				assertEquals(actualName, upperCasedName);
			}
		}
	}
}
