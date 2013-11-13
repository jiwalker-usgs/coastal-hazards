package gov.usgs.cida.coastalhazards.model;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import gov.usgs.cida.coastalhazards.gson.ItemAdapter;
import gov.usgs.cida.coastalhazards.gson.serializer.DoubleSerializer;
import gov.usgs.cida.coastalhazards.model.summary.Summary;
import gov.usgs.cida.utilities.IdGenerator;
import java.io.Serializable;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.Id;
import javax.persistence.Inheritance;
import javax.persistence.InheritanceType;
import javax.persistence.JoinColumn;
import javax.persistence.OneToOne;
import javax.persistence.Table;

/**
 *
 * @author Jordan Walker <jiwalker@usgs.gov>
 */
@Entity
@Table(name = "item_parent")
@Inheritance(strategy = InheritanceType.JOINED)
public class Item implements Serializable {
    
    public enum ItemType {
        aggregation,
        data;
    }

    private static final long serialVersionUID = 2L;
    private static final int doublePrecision = 5;
    
    public static final String ITEM_TYPE = "item_type";
    
    protected String id;
    protected ItemType itemType;
    protected double[] bbox;
    protected Summary summary;

    @Id
    public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}
    
    @Enumerated(EnumType.STRING)
    @Column(name = ITEM_TYPE)
    public ItemType getItemType() {
        return itemType;
    }

    public void setItemType(ItemType itemType) {
        this.itemType = itemType;
    }
    
	public double[] getBbox() {
		return bbox;
	}

	public void setBbox(double[] bbox) {
		this.bbox = bbox;
	}
    
    @OneToOne(cascade = CascadeType.ALL)
	@JoinColumn(columnDefinition = "summary_id")
	public Summary getSummary() {
		return summary;
	}

	public void setSummary(Summary summary) {
		this.summary = summary;
	}
    
    public static Item fromJSON(String json) {

		Item node;
		GsonBuilder gsonBuilder = new GsonBuilder();
        gsonBuilder.registerTypeAdapter(Item.class, new ItemAdapter());
//        gsonBuilder.registerTypeAdapter(Geometry.class, new GeometryDeserializer());
//        gsonBuilder.registerTypeAdapter(Envelope.class, new EnvelopeDeserializer());
//        gsonBuilder.registerTypeAdapter(CoordinateSequence.class, new CoordinateSequenceDeserializer());
		Gson gson = gsonBuilder.create();

		node = gson.fromJson(json, Item.class);
		if (node.getId() == null) {
			node.setId(IdGenerator.generate());
		}
		return node;
	}

	public String toJSON() {
		return new GsonBuilder()
				.registerTypeAdapter(Double.class, new DoubleSerializer(doublePrecision))
				.create()
				.toJson(this);
	}
}
