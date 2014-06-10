package gov.usgs.cida.coastalhazards.wps;

import com.google.common.collect.ImmutableSet;
import com.google.common.collect.ImmutableSortedSet;
import gov.usgs.cida.coastalhazards.util.GeoserverUtils;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.apache.commons.lang.StringUtils;
import org.geoserver.catalog.Catalog;
import org.geoserver.catalog.DataStoreInfo;
import org.geoserver.catalog.WorkspaceInfo;
import org.geoserver.wps.gs.GeoServerProcess;
import org.geoserver.wps.gs.ImportProcess;
import org.geotools.data.DataAccess;
import org.geotools.data.FeatureSource;
import org.geotools.process.ProcessException;
import org.geotools.process.factory.DescribeParameter;
import org.geotools.process.factory.DescribeProcess;
import org.geotools.process.factory.DescribeResult;
import org.opengis.feature.Feature;
import org.opengis.feature.type.AttributeDescriptor;
import org.opengis.feature.type.FeatureType;
import org.opengis.feature.type.Name;

@DescribeProcess(
		title = "Normalize Layer Column Names",
		description = "Given a layer, workspace, and store, the column names will be normalized to upper-case.",
		version = "1.0.0")
public class NormalizeLayerColumnNamesProcess implements GeoServerProcess {

	private final Catalog catalog;
	private final ImportProcess importProcess;
	/**
	 * Geoserver relies on case-sensitive attributes. We cannot reformat these attributes.
	 * In addition, we do not write SLDs against these attributes, so we don't need to care.
	 */
	public static final ImmutableSet<String> COLUMN_NAMES_TO_IGNORE = (
		new ImmutableSortedSet.Builder<>(String.CASE_INSENSITIVE_ORDER)
			.add(
					"the_geom",
					"id"
			)
		).build();
	
	public NormalizeLayerColumnNamesProcess(ImportProcess importer, Catalog catalog) {
		this.catalog = catalog;
		this.importProcess = importer;
	}

	@DescribeResult(name = "columnMapping", description = "List of column renames in format: 'Original Column Name|New Column Name\nOriginal Column Name|New Column Name...'")
	
	public String execute(
			@DescribeParameter(name = "layer", min = 1, description = "Input Layer To Normalize Columns On") String layer,
			@DescribeParameter(name = "workspace", min = 1, description = "Workspace in which layer resides") String workspace,
			@DescribeParameter(name = "store", min = 1, description = "Store in which layer resides") String store
	)
			throws ProcessException {
		GeoserverUtils gsUtils = new GeoserverUtils(catalog);
		WorkspaceInfo ws = gsUtils.getWorkspaceByName(workspace);
		DataStoreInfo ds = gsUtils.getDataStoreByName(ws.getName(), store);
		DataAccess<? extends FeatureType, ? extends Feature> da = gsUtils.getDataAccess(ds, null);
		FeatureSource<? extends FeatureType, ? extends Feature> featureSource = gsUtils.getFeatureSource(da, layer);
		FeatureType featureType = featureSource.getSchema();
		List<AttributeDescriptor> attributeList = new ArrayList(featureType.getDescriptors());
		int length = attributeList.size();
		List<String> renameColumnMapping = new ArrayList<>(length);
		AttributeDescriptor attributeDescriptor;
		for (int i = 0; i < length; i++) {
			attributeDescriptor = attributeList.get(i);
			Name attributeName = attributeDescriptor.getName();
			if(null == attributeName){
				continue;
			}
			String oldName = attributeName.toString();		
			if(!COLUMN_NAMES_TO_IGNORE.contains(oldName)){
				String newName = oldName.toUpperCase(Locale.ENGLISH);
				String mapping = oldName + "|" + newName;
				renameColumnMapping.add(mapping);
			}
		}
		RenameLayerColumnsProcess renameLayerProc = new RenameLayerColumnsProcess(importProcess, catalog);
		String[] renameColumnMappingArray = new String[renameColumnMapping.size()];
		renameColumnMapping.toArray(renameColumnMappingArray);
		renameLayerProc.execute(layer, workspace, store, renameColumnMappingArray);
		String renameColumnMappingReport = StringUtils.join(renameColumnMappingArray, "\n");
		return renameColumnMappingReport;
	}
}
