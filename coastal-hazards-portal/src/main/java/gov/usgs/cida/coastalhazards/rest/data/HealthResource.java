package gov.usgs.cida.coastalhazards.rest.data;

import com.google.gson.Gson;
import gov.usgs.cida.coastalhazards.gson.GsonUtil;
import gov.usgs.cida.coastalhazards.jpa.ItemManager;
import gov.usgs.cida.coastalhazards.jpa.JPAHelper;
import gov.usgs.cida.coastalhazards.model.Item;
import java.util.Map;
import java.util.TreeMap;
import javax.persistence.EntityManagerFactory;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

/**
 *
 * @author Jordan Walker <jiwalker@usgs.gov>
 */
@Path("health")
public class HealthResource {
    
    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Response healthCheck() {
        Response response;
        
        boolean overallHealth = true;
        Map<String, Boolean> componentCheckMap = new TreeMap<>();
        
        try {
            EntityManagerFactory emf = JPAHelper.getEntityManagerFactory();
            boolean open = emf.isOpen();
            componentCheckMap.put("EntityManagerFactory", open);
            overallHealth = open && overallHealth;
        } catch (Exception e) {
            componentCheckMap.put("EntityManagerFactory", false);
            overallHealth = false;
        }
        
        try {
            Gson defaultGson = GsonUtil.getDefault();
            boolean ok = (defaultGson != null);
            componentCheckMap.put("DefaultGson", ok);
            overallHealth = ok && overallHealth;
        } catch (Exception e) {
            componentCheckMap.put("DefaultGson", false);
            overallHealth = false;
        }
        
        try {
            Gson idGson = GsonUtil.getIdOnlyGson();
            boolean ok = (idGson != null);
            componentCheckMap.put("NonSubtreeGson", ok);
            overallHealth = ok && overallHealth;
        } catch (Exception e) {
            componentCheckMap.put("NonSubtreeGson", false);
            overallHealth = false;
        }
        
        try {
            Gson subtreeGson = GsonUtil.getSubtreeGson();
            boolean ok = (subtreeGson != null);
            componentCheckMap.put("SubtreeGson", ok);
            overallHealth = ok && overallHealth;
        } catch (Exception e) {
            componentCheckMap.put("SubtreeGson", false);
            overallHealth = false;
        }
        
        try (ItemManager im = new ItemManager()) {
            Item uber = im.load("uber");
            boolean ok = (uber != null && uber.isEnabled());
            componentCheckMap.put("ItemManager", ok);
            overallHealth = ok && overallHealth;
        } catch (Exception e) {
            componentCheckMap.put("ItemManager", false);
            overallHealth = false;
        }
        
        Gson gson = GsonUtil.getDefault();
        String json = gson.toJson(componentCheckMap);
        if (overallHealth) {
            response = Response.ok(json, MediaType.APPLICATION_JSON_TYPE).build();
        } else {
            response = Response.serverError().entity(json).build();
        }
        
        return response;
    }

}
