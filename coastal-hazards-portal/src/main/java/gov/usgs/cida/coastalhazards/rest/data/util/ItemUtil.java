package gov.usgs.cida.coastalhazards.rest.data.util;

import gov.usgs.cida.coastalhazards.model.Item;
import gov.usgs.cida.coastalhazards.model.util.ItemLastUpdateComparator;
import java.util.Date;
import java.util.List;
import java.util.SortedSet;
import java.util.TreeSet;

/**
 *
 * @author Jordan Walker <jiwalker@usgs.gov>
 */
public class ItemUtil {
    
    private static final int MAX_DEPTH = 20;
    private static final ItemLastUpdateComparator updateComparator = new ItemLastUpdateComparator();

    /**
     * Gathers the attributes of all items below this one in the "tree"
     * 
     * @param item Item to traverse
     * @return SortedSet of attribute names (sorted for peeking at first item)
     */
    public static SortedSet<String> gatherAttributes(Item item) {
        return gatherAttributes(item, 0);
    }
    
    /** Protects against cycles (though they shouldn't exist (fingers crossed)) */
    private static SortedSet<String> gatherAttributes(Item item, int depth) {
        SortedSet<String> attrs = new TreeSet<>();
        if (item != null && depth < MAX_DEPTH) {
            Item.ItemType type = item.getItemType();
            if (type == Item.ItemType.data) {
                attrs.add(item.getAttr());
            } else if (type == Item.ItemType.aggregation || type == Item.ItemType.uber) {
                List<Item> children = item.getChildren();
                for (Item child : children) {
                    attrs.addAll(gatherAttributes(child, depth + 1));
                }
            }
        }
        return attrs;
    }
    
    public static Item gatherNewest(Item item) {
        return gatherNewest(item, 0);
    }
    
    private static Item gatherNewest(Item item, int depth) {
        Item newest = item;
        if (item != null && depth < MAX_DEPTH) {
            Item.ItemType type = item.getItemType();
            if (type == Item.ItemType.aggregation || type == Item.ItemType.uber) {
                List<Item> children = item.getChildren();
                for (Item child : children) {
                    Item newestChild = gatherNewest(child, depth + 1);
                    if (updateComparator.compare(newestChild, item) > 0) {
                        newest = newestChild;
                    }
                }
            }
        }
        return newest;
    }
    
}
